"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LogosHeader from "../../components/LogosHeader";
import { Section, ChipRow, BulletRow, ScoreCard } from "./Components";

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
        const pId = params?.id as string;
        const reserved = ['view', 'placeholder', 'fallback', 'index', 'loading', 'undefined', 'null'];
        if (pId && !reserved.includes(pId)) {
            setIdeaId(pId);
        }
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
        return {
            d: (sum.d / count).toFixed(1),
            f: (sum.f / count).toFixed(1),
            v: (sum.v / count).toFixed(1),
            p: (sum.p / count).toFixed(1),
        };
    }, [juryScores]);

    useEffect(() => {
        if (!ideaId) return;

        const run = async () => {
            setLoading(true);
            setError(null);
            setMissingTableError(false);

            // Fetch by team_id (the [id] param)
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
                setError("Team not found");
                setLoading(false);
                return;
            }

            setTeam(teamData as TeamRow);
            await refreshData(teamData as TeamRow, ideaId);
            setLoading(false);
        };

        run();
    }, [ideaId]);

    const refreshData = async (teamData: TeamRow, actualId: string) => {
        const tables = [
            { name: "ai_evaluations", cols: ["team_name", "team_id"], sort: "evaluated_at" },
            { name: "human_evaluations", cols: ["team_name", "idea_id"], sort: null },
            { name: "evaluation_runs", cols: ["team_name"], sort: null },
            { name: "idea_submissions", cols: ["team_name", "team_id"], sort: null }
        ];

        let finalResult: any = null;

        for (const table of tables) {
            for (const col of table.cols) {
                try {
                    let query = supabase.from(table.name).select("*");
                    if (col.includes("id") || col === "team_id") {
                        query = query.eq(col, actualId);
                    } else if (col.includes("name") || col === "team") {
                        query = query.ilike(col, teamData.team_name.trim());
                    }

                    if (table.sort) {
                        query = query.order(table.sort, { ascending: false });
                    }

                    const { data, error } = await query.limit(1).maybeSingle();

                    if (data) {
                        if (!finalResult) {
                            finalResult = { ...data };
                        }
                    }
                } catch (e: any) {
                    // Ignore
                }
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

                {!team ? (
                    <div className="rounded-xl bg-white border p-8 shadow-sm text-center">
                        <div className="text-xl font-semibold mb-2">No team found</div>
                        <div className="text-zinc-500 mb-6">
                            ID: <span className="font-mono bg-zinc-100 px-2 py-1 rounded">{ideaId || "Empty"}</span>
                        </div>


                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* SEARCH BOX (Relocated) */}
                        <div className="relative w-full max-w-lg mx-auto">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowSearchResults(true)}
                                placeholder="Search Team Name..."
                                className="w-full bg-white border border-zinc-200 rounded-full px-4 py-3 pl-10 text-sm text-zinc-800 placeholder:text-zinc-400 focus:ring-4 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all shadow-sm hover:shadow-md"
                            />
                            <div className="absolute left-3 top-3.5 text-zinc-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {/* Autocomplete Dropdown */}
                            {showSearchResults && searchResults.length > 0 && (
                                <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-[60]">
                                    {searchResults.map((t) => (
                                        <button
                                            key={t.team_id}
                                            onClick={() => handleSearchSelect(t.team_id)}
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 text-sm text-zinc-700 transition-colors border-b border-zinc-50 last:border-none"
                                        >
                                            {t.team_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl bg-white border shadow-sm p-8">
                            <div className="border-b pb-6 mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">{team.team_name}</h1>
                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-mono text-zinc-500">
                                        <span className="bg-zinc-100 px-2 py-1 rounded">ID: {team.team_id.slice(0, 8)}...</span>
                                        {team.team_size && (
                                            <span className="flex items-center gap-1 text-zinc-600 bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                                                👥 {team.team_size} Members
                                            </span>
                                        )}
                                        {team.contact_email && (
                                            <span className="flex items-center gap-1 text-zinc-600 bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                                                ✉️ {team.contact_email}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {juryScores.length > 0 && (
                                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-700 font-bold shadow-sm animate-in fade-in zoom-in">
                                        <span className="text-xl">✓</span>
                                        Already Evaluated
                                    </div>
                                )}
                            </div>
                            {team.team_members && (
                                <div className="mb-8 p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                                    <h3 className="text-base font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        Team Structure
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {(typeof team.team_members === 'string' ? team.team_members.split(',') : []).map((member: string, idx: number) => {
                                            const name = member.trim();
                                            if (!name) return null;
                                            return (
                                                <div key={idx} className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-zinc-200 shadow-sm">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-zinc-900 text-sm">{name}</span>
                                                        <span className="text-xs text-zinc-500">
                                                            {(team.team_roles?.split(',')?.[idx] || "Member").trim()}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <Section title="Problem" text={team.problem_statement} subHeader={team.problem_title} />
                                <Section title="Proposed Solution" text={team.proposed_solution} />
                                <BulletRow title="Innovation Highlights" items={team.innovation_highlights} />
                                <Section title="Business Model" text={team.business_model} />
                                <Section title="Market Insight" text={team.market_insight} />
                                <ChipRow title="TARGET USERS" items={team.target_users} variant="blue" />
                                <ChipRow title="TECHNOLOGY STACK" items={team.tech_stack} variant="indigo" />
                                <Section title="MARKET READINESS" text={team.market_readiness} />
                                <Section title="EXECUTION READINESS / RISK" text={team.execution_risk} />
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white border shadow-sm p-8 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                            <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-3 text-blue-900">
                                Jury Scoring Board
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <ScoreCard
                                    title="Desirability"
                                    emoji="❤️"
                                    value={averages?.d || jury.desirability}
                                    onChange={(v) => handleJuryScoreChange("desirability", v)}
                                    submitted={submitted}
                                    ai={aiScores10.d}
                                    aiRevealed={aiRevealed}
                                    disabled={juryScores.length > 0}
                                />
                                <ScoreCard
                                    title="Feasibility"
                                    emoji="🛠️"
                                    value={averages?.f || jury.feasibility}
                                    onChange={(v) => handleJuryScoreChange("feasibility", v)}
                                    submitted={submitted}
                                    ai={aiScores10.f}
                                    aiRevealed={aiRevealed}
                                    disabled={juryScores.length > 0}
                                />
                                <ScoreCard
                                    title="Viability"
                                    emoji="💰"
                                    value={averages?.v || jury.viability}
                                    onChange={(v) => handleJuryScoreChange("viability", v)}
                                    submitted={submitted}
                                    ai={aiScores10.v}
                                    aiRevealed={aiRevealed}
                                    disabled={juryScores.length > 0}
                                />
                                <ScoreCard
                                    title="Presentation"
                                    emoji="🎤"
                                    value={averages?.p || jury.presentation}
                                    onChange={(v) => handleJuryScoreChange("presentation", v)}
                                    submitted={submitted}
                                    ai={null}
                                    aiRevealed={aiRevealed}
                                    isManualOnly
                                    disabled={juryScores.length > 0}
                                />
                            </div>

                            <div className="mt-8 flex items-center justify-end border-t pt-6 gap-4">
                                {juryScores.length > 0 && (
                                    <div className="mr-auto text-sm font-medium text-emerald-600 flex items-center gap-1.5 py-2 px-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <span className="text-lg">✓</span>
                                        Evaluation complete. Form locked.
                                    </div>
                                )}

                                {!submitted && juryScores.length === 0 && (
                                    <button
                                        onClick={onSubmit}
                                        disabled={submitting}
                                        className="px-8 py-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {submitting ? (
                                            <><span>⏳</span> Submitting...</>
                                        ) : (
                                            "Submit"
                                        )}
                                    </button>
                                )}

                                {juryScores.length > 0 && (
                                    <button
                                        onClick={() => router.push('/')}
                                        className="px-6 py-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold text-lg transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        Back to Home
                                    </button>
                                )}

                                {(submitted || juryScores.length > 0) && (!aiRevealed || aiScores10.d === null) && (
                                    <button
                                        onClick={async () => {
                                            if (team) await refreshData(team, team.team_id);
                                            setAiRevealed(true);
                                        }}
                                        className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <span>🤖</span> {aiRevealed ? "Try Refreshing Scores" : "Reveal AI Scores"}
                                    </button>
                                )}
                            </div>


                            {submitted && (
                                <div className="mt-6 p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="text-2xl">🎉</div>
                                    <div>
                                        <div className="font-bold">Scores Submitted Successfully!</div>
                                        <div className="text-sm opacity-90">Thank you for evaluating this project.</div>
                                    </div>
                                </div>
                            )}

                            {submitted && result && (
                                <div className="mt-8 space-y-6">
                                    {(result.market_context_signal || result.execution_readiness_signal) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {result.market_context_signal && (
                                                <div className="p-5 rounded-xl border border-zinc-100 bg-amber-50/30">
                                                    <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <span>🎯</span> Market Context Signal
                                                    </h4>
                                                    <p className="text-zinc-700 text-sm leading-relaxed">
                                                        {result.market_context_signal}
                                                    </p>
                                                </div>
                                            )}
                                            {result.execution_readiness_signal && (
                                                <div className="p-5 rounded-xl border border-zinc-100 bg-emerald-50/30">
                                                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <span>🚀</span> Execution Readiness Signal
                                                    </h4>
                                                    <p className="text-zinc-700 text-sm leading-relaxed">
                                                        {result.execution_readiness_signal}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {result.summary && (
                                        <details className="group rounded-xl border border-zinc-200 bg-zinc-50 p-4 open:bg-white open:shadow-sm transition-all">
                                            <summary className="cursor-pointer font-semibold text-zinc-700 flex items-center gap-2 select-none">
                                                <span>🤖</span> Reveal AI Reasoning
                                                <span className="group-open:rotate-180 transition-transform ml-auto">▼</span>
                                            </summary>
                                            <div className="mt-4 text-zinc-600 leading-relaxed whitespace-pre-wrap pl-6 border-l-2 border-zinc-200">
                                                {result.summary}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


// Internal Components removed - now in Components.tsx
