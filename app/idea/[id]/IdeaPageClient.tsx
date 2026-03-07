"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LogosHeader from "../../components/LogosHeader";
import { Section, ChipRow, BulletRow, ScoreCard, AISnapshot, InnovationMetrics, CollapsibleSection } from "./Components";
import { Target, Zap, Lightbulb, Mic2, Rocket, ShieldCheck, TrendingUp, Sparkles, Cpu, AlertTriangle, Heart, Hammer } from "lucide-react";

type TeamRow = {
    team_id: string;
    team_name: string;
    problem_title: string | null;
    problem_statement: string | null;
    team_size: number | null;
    team_members: string | null;
    team_roles: string | null;
    contact_email: string | null;
    proposed_solution: string | null;
    target_users: string | null;
    innovation_highlights: string | null;
    tech_stack: string | null;
    market_readiness: string | null;
    execution_risk: string | null;
    pdf_upload: string | null;
    business_model: string | null;
    market_insight: string | null;
};

type ResultRow = {
    team_id: string;
    summary: string | null;
    desirability_score: number | string | null;
    feasibility_score: number | string | null;
    viability_score: number | string | null;
    average_dfv_score: number | string | null;
    weighted_dfv?: number | string | null; // From legacy table
    insights: string | null;
    market_context_signal: string | null;
    execution_readiness_signal: string | null;
    transaction_details: any | null;
    created_at: string;
    market_readiness?: number | string | null;
    execution_risk?: number | string | null;
};

type JuryScoreRow = {
    idea_id: string;
    team_name: string;
    desirability_score: number | null;
    feasibility_score: number | null;
    viability_score: number | null;
    presentation?: number | null; // Keep for UI even if missing from DB for now
};

export default function IdeaPageClient() {
    const params = useParams();
    const router = useRouter();

    // In static export with Cloudflare rewrites, useParams might return "placeholder".
    // We attempt to get the real ID from the URL path.
    const [ideaId, setIdeaId] = useState<string>("");

    useEffect(() => {
        const extractId = () => {
            let pId = params?.id as string;
            if (pId) pId = decodeURIComponent(pId);
            const reserved = ['view', 'placeholder', 'fallback', 'index', 'loading', 'undefined', 'null'];

            // Fallback to URL path extraction if params is reserved or clearly a placeholder
            if (!pId || reserved.includes(pId)) {
                if (typeof window !== 'undefined') {
                    const pathParts = window.location.pathname.split('/');
                    const lastPart = pathParts[pathParts.length - 1];
                    if (lastPart && !reserved.includes(lastPart)) {
                        pId = decodeURIComponent(lastPart);
                    }
                }
            }

            if (pId && !reserved.includes(pId)) {
                setIdeaId(pId);
            }
        };

        extractId();

        // Retry logic for hydration delays
        const timer = setTimeout(extractId, 500);
        return () => clearTimeout(timer);
    }, [params]);

    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState<TeamRow | null>(null);
    const [result, setResult] = useState<ResultRow | null>(null);
    const [juryScores, setJuryScores] = useState<JuryScoreRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [missingTableError, setMissingTableError] = useState(false);

    const [jury, setJury] = useState({
        desirability: "",
        feasibility: "",
        viability: "",
        presentation: "",
    });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [aiRevealed, setAiRevealed] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ team_id: string, team_name: string }[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const aiScores10 = useMemo(() => {
        const raw = result as any;
        const d = raw?.desirability_score ?? raw?.desirability ?? null;
        const f = raw?.feasibility_score ?? raw?.feasibility ?? null;
        const v = raw?.viability_score ?? raw?.viability ?? null;
        const avg = raw?.average_dfv_score ?? raw?.weighted_dfv ?? null;
        const mr = raw?.market_readiness ?? null;
        const er = raw?.execution_risk ?? null;

        const toDisplay = (x: any) => {
            if (x === null || x === undefined) return null;
            const n = typeof x === 'string' ? parseFloat(x) : x;
            return isNaN(n) ? null : Math.round(n * 10) / 10;
        };
        return {
            d: toDisplay(d),
            f: toDisplay(f),
            v: toDisplay(v),
            avg: toDisplay(avg),
            mr: toDisplay(mr),
            er: toDisplay(er)
        };
    }, [result]);

    const averages = useMemo(() => {
        if (juryScores.length === 0) return null;
        const sum = juryScores.reduce((acc, curr) => ({
            d: acc.d + Number(curr.desirability_score || 0),
            f: acc.f + Number(curr.feasibility_score || 0),
            v: acc.v + Number(curr.viability_score || 0),
            p: acc.p + Number(curr.presentation || 0),
        }), { d: 0, f: 0, v: 0, p: 0 });

        const count = juryScores.length;
        const h_ds = sum.d / count;
        const h_fs = sum.f / count;
        const h_vs = sum.v / count;
        const h_ps = sum.p / count;

        return {
            d: h_ds.toFixed(1),
            f: h_fs.toFixed(1),
            v: h_vs.toFixed(1),
            p: h_ps.toFixed(1),
            raw: { d: h_ds, f: h_fs, v: h_vs, p: h_ps }
        };
    }, [juryScores]);

    const metrics = useMemo(() => {
        if (!averages || !aiScores10.avg) return null;

        const ai_mr = aiScores10.mr || 0;
        const ai_fs = aiScores10.f || aiScores10.er || 0;
        const ai_vs = aiScores10.v || 0;
        const ai_er = aiScores10.er || 5;

        const h = averages.raw;

        // Calculate Alignment (matching Home page logic)
        const dev = Math.abs(ai_mr - h.d) + Math.abs(ai_fs - h.f) + Math.abs(ai_vs - h.v) + Math.abs((10 - ai_er) - h.p);
        const alignment = Math.max(0, Math.min(100, Math.round(100 - (dev * 2.5))));

        // Calculate Index
        const h_avg = (h.d + h.f + h.v + h.p) / 4;
        const index = Math.round((h_avg * 8) + (alignment * 0.2));

        let classification = "Standard Protocol";
        if (index >= 85) classification = "Strategic Frontier";
        else if (index >= 70) classification = "High Potential";
        else if (index < 40) classification = "High Risk Node";

        return {
            alignment,
            index,
            classification,
            totalDeviation: dev,
            juryData: [h.d, h.f, h.v, h.p],
            aiData: [ai_mr, ai_fs, ai_vs, 10 - ai_er]
        };
    }, [averages, aiScores10]);

    useEffect(() => {
        if (!ideaId) {
            // If we've waited 3 seconds and still no valid ID, something is wrong
            const timer = setTimeout(() => {
                if (!ideaId) {
                    setError("Invalid URL structure or ID missing");
                    setLoading(false);
                }
            }, 3000);
            return () => clearTimeout(timer);
        }

        const run = async () => {
            setLoading(true);
            setError(null);
            setMissingTableError(false);

            try {
                // Fetch by team_id
                const { data: teamData, error: teamError } = await supabase
                    .from("idea_submissions")
                    .select("*")
                    .eq("team_id", ideaId)
                    .maybeSingle();

                if (teamError) {
                    setError(`Teams fetch error: ${teamError.message}`);
                    setLoading(false);
                    return;
                }

                if (!teamData) {
                    setError("Intelligence Node Not Found. This entry may have been purged or the ID is invalid.");
                    setLoading(false);
                    return;
                }

                setTeam(teamData as TeamRow);
                await refreshData(teamData as TeamRow, ideaId);
            } catch (e: any) {
                setError(`Fetch error: ${e.message}`);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [ideaId]);

    const refreshData = async (teamData: TeamRow, actualId: string) => {
        const tables = [
            { name: "ai_evaluations", idCol: "team_id", sort: "evaluated_at" },
            { name: "human_evaluations", idCol: "idea_id", sort: null },
            { name: "evaluation_runs", idCol: "team_id", sort: null },
            { name: "idea_submissions", idCol: "team_id", sort: null }
        ];

        let finalResult: any = null;

        for (const table of tables) {
            try {
                let query = supabase.from(table.name).select("*").eq(table.idCol, actualId);

                if (table.sort) {
                    query = query.order(table.sort, { ascending: false });
                }

                const { data, error } = await query.limit(1).maybeSingle();

                if (data && !finalResult) {
                    finalResult = { ...data };
                }
            } catch (e: any) {
                // Ignore
            }
        }

        setResult(finalResult as ResultRow | null);

        if (teamData?.team_name) {
            await fetchJuryScores(teamData.team_name, actualId, finalResult !== null);
        }
    };

    useEffect(() => {
        const fetchTeams = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("idea_submissions")
                    .select("team_id, team_name")
                    .ilike("team_name", `%${searchQuery}%`)
                    .limit(5);

                if (error) {
                    if (error.code === '42P01') {
                        setSearchResults([]);
                        return;
                    }
                    console.error("Error fetching teams:", error);
                    setSearchResults([]);
                    return;
                }

                if (data) {
                    setSearchResults(data as any[]);
                    setShowSearchResults(true);
                }
            } catch (e) {
                console.error("Unexpected error during team fetch:", e);
                setSearchResults([]);
            }
        };

        const timeoutId = setTimeout(fetchTeams, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSearchSelect = (id: string) => {
        router.push(`/idea/${id}`);
        setSearchQuery("");
        setShowSearchResults(false);
    };

    const handleJuryScoreChange = (category: string, value: string) => {
        const num = Number(value);
        if (num > 10) return; // Hard block
        setJury((s) => ({ ...s, [category]: value }));
    };

    const fetchJuryScores = async (teamName: string, teamId: string, hasAiResult: boolean = false) => {
        const { data, error } = await supabase
            .from("human_evaluations")
            .select("idea_id, team_name, desirability_score, feasibility_score, viability_score")
            .eq("idea_id", teamId);

        if (error) {
            if (error.code === '42P01' || error.message.includes('Could not find the table')) {
                setMissingTableError(true);
            } else {
                console.error("Error fetching jury scores:", error);
            }
        } else {
            const scores = data as JuryScoreRow[] || [];
            setJuryScores(scores);
            // Auto-reveal ONLY if evaluations exist AND we have the AI data ready
            if (scores.length > 0 && hasAiResult) {
                setAiRevealed(true);
            }
        }
    };

    const clamp10 = (s: string) => {
        const n = Number(s);
        if (Number.isNaN(n) || s.trim() === "") return null;
        if (n < 0) return 0;
        if (n > 10) return 10;
        return n;
    };

    const onSubmit = async () => {
        setSubmitted(false);
        setError(null);

        if (juryScores.length > 0) {
            setError("This team has already been evaluated.");
            return;
        }

        if (!team?.team_name) {
            setError("Team data not loaded properly.");
            return;
        }

        const d = clamp10(jury.desirability);
        const f = clamp10(jury.feasibility);
        const v = clamp10(jury.viability);
        const p = clamp10(jury.presentation);

        if (d === null || f === null || v === null || p === null) {
            setError("Enter valid jury scores (0 to 10) for all 4 categories.");
            return;
        }

        setSubmitting(true);
        try {
            // CRITICAL: use actualId (UUID) from the resolved team record, NOT the team name from URL
            const actualId = team.team_id;

            const { error: insertError } = await supabase.from("human_evaluations").insert([{
                team_name: team.team_name,
                idea_id: actualId,
                desirability_score: d,
                feasibility_score: f,
                viability_score: v,
                // presentation_score is missing in DB schema, so we omit it to prevent errors
            }]);

            if (insertError) throw insertError;

            setSubmitted(true);
            await fetchJuryScores(team.team_name, actualId);
            setJury({ desirability: "", feasibility: "", viability: "", presentation: "" });

        } catch (e: any) {
            setError(e?.message || "Submit failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                <LogosHeader />
                <div className="flex items-center justify-center p-20 text-xl text-slate-500 animate-pulse">
                    Loading Idea details...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-brand-accent/30">
            <div className="max-w-6xl mx-auto p-6 md:p-8">
                <LogosHeader />
                {missingTableError && (
                    <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 shadow-sm flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <div className="font-bold">Database Setup Required</div>
                            <div className="text-sm opacity-90 mb-2">
                                Some evaluation tables are missing or not matching expected schema.
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
                        🚨 {error}
                    </div>
                )}

                {error ? (
                    <div className="rounded-[2rem] bg-white border border-rose-100 p-16 shadow-2xl text-center flex flex-col items-center gap-6 animate-advanced-reveal">
                        <div className="h-20 w-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                            <AlertTriangle size={40} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-900 uppercase italic tracking-tight mb-3">Intelligence Link Failed</div>
                            <div className="text-slate-500 font-medium max-w-md mx-auto">{error}</div>
                        </div>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-4 px-10 py-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase italic tracking-[0.2em] shadow-xl transition-all"
                        >
                            Back
                        </button>
                    </div>
                ) : !team ? (
                    <div className="rounded-xl bg-white border p-8 shadow-sm text-center">
                        <div className="text-xl font-semibold mb-2">Initializing intelligence handshake...</div>
                        <div className="text-zinc-500 mb-6">
                            Linking to Node: <span className="font-mono bg-zinc-100 px-2 py-1 rounded">{ideaId || "Resolving..."}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* LEFT COLUMN: PRIMARY INTELLIGENCE */}
                        <div className="flex-1 space-y-12">
                            <AISnapshot
                                scores={aiScores10}
                                insights={result?.insights || result?.summary}
                                teamName={team.team_name}
                                problemTitle={team.problem_title}
                            />

                            <div className="space-y-2">
                                <CollapsibleSection title="Submission Objective" icon="🎯" defaultOpen={true}>
                                    <Section title="Problem Space" text={team.problem_statement} subHeader={team.problem_title} icon={<Target size={18} />} />
                                    <Section title="Proposed Solution" text={team.proposed_solution} icon={<Zap size={18} />} />
                                    <BulletRow title="Innovation Highlights" items={team.innovation_highlights} icon={<Sparkles size={18} />} />
                                </CollapsibleSection>

                                <CollapsibleSection title="Execution & Market" icon="🚀" defaultOpen={false}>
                                    <Section title="Business Model" text={team.business_model} icon={<TrendingUp size={18} />} />
                                    <Section title="Market Insight" text={team.market_insight} icon={<Cpu size={18} />} />
                                    <ChipRow title="TARGET USERS" items={team.target_users} variant="blue" icon={<Target size={18} />} />
                                    <ChipRow title="TECHNOLOGY STACK" items={team.tech_stack} variant="indigo" icon={<Cpu size={18} />} />
                                </CollapsibleSection>

                                <CollapsibleSection title="Risk Analysis" icon="🛡️" defaultOpen={false}>
                                    <Section title="MARKET READINESS" text={team.market_readiness} icon={<TrendingUp size={18} />} />
                                    <Section title="EXECUTION READINESS / RISK" text={team.execution_risk} icon={<ShieldCheck size={18} />} />
                                </CollapsibleSection>

                                <CollapsibleSection title="Team Protocol" icon="👥" defaultOpen={false}>
                                    {(() => {
                                        const members = Array.isArray(team.team_members) ? team.team_members : (typeof team.team_members === 'string' ? team.team_members.split(',') : []);
                                        const roles = Array.isArray(team.team_roles) ? team.team_roles : (typeof team.team_roles === 'string' ? team.team_roles.split(',') : []);

                                        return members.map((member: string, idx: number) => {
                                            const name = member.trim();
                                            if (!name) return null;
                                            return (
                                                <div key={idx} className="flex items-center gap-4 bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm italic">
                                                        {name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-900 text-sm uppercase italic">{name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {(roles[idx] || "Specialist").trim()}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </CollapsibleSection>
                            </div>

                            {/* JURY SCORING BOARD */}
                            <div className="rounded-[2.5rem] bg-white border border-slate-200 shadow-xl p-10 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-accent"></div>
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                                        Jury Scoring Protocol
                                    </h2>
                                    {juryScores.length > 0 && (
                                        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            Evaluation Locked
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <ScoreCard
                                        title="Desirability"
                                        emoji={<Heart size={18} />}
                                        value={averages?.d || jury.desirability}
                                        onChange={(v) => handleJuryScoreChange("desirability", v)}
                                        submitted={submitted}
                                        ai={aiScores10.d}
                                        aiRevealed={aiRevealed}
                                        disabled={juryScores.length > 0}
                                    />
                                    <ScoreCard
                                        title="Feasibility"
                                        emoji={<Hammer size={18} />}
                                        value={averages?.f || jury.feasibility}
                                        onChange={(v) => handleJuryScoreChange("feasibility", v)}
                                        submitted={submitted}
                                        ai={aiScores10.f}
                                        aiRevealed={aiRevealed}
                                        disabled={juryScores.length > 0}
                                    />
                                    <ScoreCard
                                        title="Viability"
                                        emoji={<TrendingUp size={18} />}
                                        value={averages?.v || jury.viability}
                                        onChange={(v) => handleJuryScoreChange("viability", v)}
                                        submitted={submitted}
                                        ai={aiScores10.v}
                                        aiRevealed={aiRevealed}
                                        disabled={juryScores.length > 0}
                                    />
                                    <ScoreCard
                                        title="Presentation"
                                        emoji={<Mic2 size={18} />}
                                        value={averages?.p || jury.presentation}
                                        onChange={(v) => handleJuryScoreChange("presentation", v)}
                                        submitted={submitted}
                                        ai={null}
                                        aiRevealed={aiRevealed}
                                        isManualOnly
                                        disabled={juryScores.length > 0}
                                    />
                                </div>

                                <div className="mt-12 flex items-center justify-end gap-4 border-t border-slate-100 pt-8">
                                    {!submitted && juryScores.length === 0 && (
                                        <button
                                            onClick={onSubmit}
                                            disabled={submitting}
                                            className="px-10 py-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase italic tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                        >
                                            {submitting ? "Submitting..." : "Submit"}
                                        </button>
                                    )}

                                    {(submitted || juryScores.length > 0) && (!aiRevealed || aiScores10.d === null) && (
                                        <button
                                            onClick={async () => {
                                                if (team) await refreshData(team, team.team_id);
                                                setAiRevealed(true);
                                            }}
                                            className="px-10 py-5 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-sm uppercase italic tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-3"
                                        >
                                            <Sparkles size={18} /> AI SCORE
                                        </button>
                                    )}

                                    <button
                                        onClick={() => router.push('/')}
                                        className="px-10 py-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-black text-sm uppercase italic tracking-[0.2em] transition-all"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: STRATEGIC SPINE */}
                        <div className="w-full lg:w-96 space-y-8">
                            {metrics && (
                                <InnovationMetrics
                                    aiData={metrics.aiData}
                                    juryData={metrics.juryData}
                                    alignment={metrics.alignment}
                                    innovationIndex={metrics.index}
                                    classification={metrics.classification}
                                    totalDeviation={metrics.totalDeviation}
                                />
                            )}

                            {/* NAVIGATION / SEARCH QUICK-LINK */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-brand-accent/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Quick Navigation</span>
                                    <div className="relative">
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setShowSearchResults(true)}
                                            placeholder="Jump to team..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all"
                                        />
                                        {showSearchResults && searchResults.length > 0 && (
                                            <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[60] animate-advanced-reveal">
                                                {searchResults.map((t) => (
                                                    <button
                                                        key={t.team_id}
                                                        onClick={() => handleSearchSelect(t.team_id)}
                                                        className="w-full text-left px-5 py-4 hover:bg-slate-50 text-xs font-black uppercase tracking-tight text-slate-600 transition-colors border-b border-slate-50 last:border-none"
                                                    >
                                                        {t.team_name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


// Internal Components removed - now in Components.tsx
