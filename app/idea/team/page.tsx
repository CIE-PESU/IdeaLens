"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Target, Zap, TrendingUp, Sparkles, AlertTriangle, Users, Heart, Hammer, MessageSquare, Send, CheckCircle2, ChevronDown, Rocket, PieChart, Microscope, Swords, Briefcase, Gem, PlusCircle, Search, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// --- Helpers ---

/**
 * Formats snake_case keys to Title Case labels
 */
const formatLabel = (key: string) => {
    return key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

/**
 * Checks if a string is a valid URL
 */
const isValidUrl = (val: any) => {
    if (typeof val !== "string") return false;
    try {
        new URL(val);
        return val.startsWith("http");
    } catch {
        return false;
    }
};

/**
 * Renders values based on type (Booleans, Links, Strings)
 */
const renderValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-300 italic">No Data</span>;
    if (typeof val === "boolean") {
        return (
            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${val ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {val ? "TRUE" : "FALSE"}
            </span>
        );
    }
    if (isValidUrl(val)) {
        return (
            <a href={val} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline font-bold break-all">
                {val}
            </a>
        );
    }
    return <span className="text-slate-600 font-medium whitespace-pre-wrap">{String(val)}</span>;
};

// --- Components ---

function TeamSearchDropdown() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [teams, setTeams] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchTeams = async () => {
            const { data } = await supabase
                .from("idealens_submissions2")
                .select("id, team_name, team_members")
                .order("submitted_at", { ascending: false });
            if (data) setTeams(data);
        };
        fetchTeams();
    }, []);

    const filtered = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return teams.filter(t => 
            (t.team_name || "").toLowerCase().includes(q) ||
            (t.team_members || "").toLowerCase().includes(q)
        ).slice(0, 8);
    }, [query, teams]);

    return (
        <div className="relative w-full max-w-md group z-50">
            <input
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder="Search team name or member"
                className="w-full bg-white rounded-2xl border border-slate-200 px-5 py-3 text-sm shadow-sm group-hover:shadow-md focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all placeholder:text-slate-300 font-medium italic"
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-brand-accent transition-colors pointer-events-none" />
            
            {isOpen && filtered.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                    {filtered.map(t => (
                        <Link 
                            key={t.id}
                            href={`/idea/team?id=${encodeURIComponent(t.id)}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setIsOpen(false);
                                setQuery("");
                            }}
                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex flex-col gap-0.5 block"
                        >
                            <div className="text-[13px] font-bold text-slate-900 leading-tight">
                                {t.team_name || "Untitled"}
                            </div>
                            {t.team_members && (
                                <div className="text-[11px] text-slate-500 truncate leading-tight">
                                    {t.team_members}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function TeamDetailsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");
    const phase = searchParams.get("phase");

    const [loading, setLoading] = useState(true);
    const [submission, setSubmission] = useState<any | null>(null);
    const [humanEval, setHumanEval] = useState<any | null>(null);
    const [aiEval, setAiEval] = useState<any | null>(null);
    const [p2RefHumanEval, setP2RefHumanEval] = useState<any | null>(null);
    const [p2RefAiEval, setP2RefAiEval] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Jury Form State
    const [juryScores, setJuryScores] = useState<any>({ d: "", f: "", v: "", m: "", e: "" });
    const [juryFeedback, setJuryFeedback] = useState("");
    const [submittingJury, setSubmittingJury] = useState(false);
    const [jurySubmitted, setJurySubmitted] = useState(false);

    // Fetch Logic
    useEffect(() => {
        if (!id) {
            setError("Invalid URL structure or ID missing");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch main submission
                const { data: subData, error: subError } = await supabase
                    .from("idealens_submissions2")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (subError) throw subError;
                setSubmission(subData);

                console.log("DEBUG: Active Phase:", phase);
                console.log("DEBUG: Team ID:", id);
                console.log("DEBUG: Team Name:", subData.team_name);

                // 2. Fetch current phase human eval
                const humanEvalTable = phase === "phase3" ? "human_evaluations_phase3" : "human_evaluations";
                const { data: hData } = await supabase
                    .from(humanEvalTable)
                    .select("*")
                    .eq("idea_id", id)
                    .order('evaluated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (hData) {
                    setHumanEval(hData);
                    if (phase !== "phase3") {
                        setJurySubmitted(true);
                        setJuryScores({
                            d: hData.desirability_score || 5,
                            f: hData.feasibility_score || 5,
                            v: hData.viability_score || 5,
                            m: "",
                            e: ""
                        });
                        setJuryFeedback(hData.overall_comments || "");
                    } else {
                        // If current phase eval exists, mark as submitted for UI feedback
                        setJurySubmitted(true);
                        setJuryScores({
                            d: hData.desirability_score || "",
                            f: hData.feasibility_score || "",
                            v: hData.viability_score || "",
                            m: hData.market_context_score || "",
                            e: hData.execution_readiness_score || ""
                        });
                        setJuryFeedback(hData.overall_comments || "");
                    }
                }

                // 3. Fetch AI eval for current phase
                const aiEvalTable = phase === "phase3" ? "ai_evaluations3" : "ai_evaluations";
                // Determine match key for AI eval
                const aiMatchKey = (phase === "phase3" || aiEvalTable === "ai_evaluations3") ? "team_name" : "team_id";
                const aiMatchVal = aiMatchKey === "team_name" ? subData.team_name : id;

                const { data: aData } = await supabase
                    .from(aiEvalTable)
                    .select("*")
                    .eq(aiMatchKey, aiMatchVal)
                    .maybeSingle();

                if (aData) {
                    setAiEval(aData);
                    console.log("DEBUG: Matched current AI Eval:", aData);
                }

                // 4. Fetch Phase 2 References if in Phase 3
                if (phase === "phase3") {
                    // Fetch Phase 2 Jury Ref (always idea_id)
                    const { data: p2HData } = await supabase
                        .from("human_evaluations")
                        .select("*")
                        .eq("idea_id", id)
                        .order('evaluated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    
                    if (p2HData) {
                        setP2RefHumanEval(p2HData);
                        console.log("DEBUG: Matched Phase 2 Jury Ref:", p2HData);
                    }

                    // Fetch Phase 2 AI Ref (from ai_evaluations3 which serves as reference for P3)
                    // Wait, the user said "Read AI reference scores from ai_evaluations3"
                    // And "Read jury reference scores from the correct Phase 3 reference source"
                    // If aiEval is already from ai_evaluations3, then p2RefAiEval should be aiEval.
                    setP2RefAiEval(aData);
                }


            } catch (err: any) {
                console.error("Fetch error:", err);
                setError(`Failed to load data: ${err.message || String(err)}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleJurySubmit = async () => {
        if (!id || !submission) return;
        setSubmittingJury(true);
        try {
            const humanEvalTable = phase === "phase3" ? "human_evaluations_phase3" : "human_evaluations";
            
            const scoresToInsert: any = {
                idea_id: id,
                team_name: submission.team_name,
                desirability_score: juryScores.d ? Math.round(Number(juryScores.d)) : null,
                feasibility_score: juryScores.f ? Math.round(Number(juryScores.f)) : null,
                viability_score: juryScores.v ? Math.round(Number(juryScores.v)) : null,
                overall_comments: juryFeedback,
                evaluated_at: new Date().toISOString()
            };

            if (phase === "phase3") {
                scoresToInsert.market_context_score = juryScores.m ? Math.round(Number(juryScores.m)) : null;
                scoresToInsert.execution_readiness_score = juryScores.e ? Math.round(Number(juryScores.e)) : null;
            }

            const { error: insertError } = await supabase
                .from(humanEvalTable)
                .insert(scoresToInsert);

            if (insertError) {
                console.error("Raw Insert Error:", JSON.stringify(insertError));
                throw insertError;
            }

            const { data: updatedHData } = await supabase
                .from(humanEvalTable)
                .select("*")
                .eq("idea_id", id)
                .order('evaluated_at', { ascending: false })
                .limit(1)
                .single();

            setHumanEval(updatedHData);
            setJurySubmitted(true);
        } catch (err: any) {
            const errMsg = err?.message || err?.details || JSON.stringify(err);
            console.error("Submission failed exact:", err, " stringified:", errMsg);
            alert(`Submission failed: ${errMsg}`);
        } finally {
            setSubmittingJury(false);
        }
    };

    const aiAvg = useMemo(() => {
        if (!aiEval) return null;
        const keys = phase === "phase3" 
            ? ["desirability_score", "feasibility_score", "viability_score", "market_context_score", "execution_readiness_score"]
            : ["desirability_score", "feasibility_score", "viability_score"];
        
        const validScores = keys.map(k => aiEval[k]).filter(s => s !== null && s !== undefined && s !== "");
        if (validScores.length === 0) return null;
        return (validScores.reduce((a, b) => Number(a) + Number(b), 0) / validScores.length).toFixed(2);
    }, [aiEval, phase]);

    const juryAvg = useMemo(() => {
        const keys: (keyof typeof juryScores)[] = phase === "phase3" ? ["d", "f", "v", "m", "e"] : ["d", "f", "v"];
        const scores = keys.map(k => Number(juryScores[k])).filter(v => !isNaN(v) && v > 0);
        if (scores.length === 0) return "0.00";
        return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    }, [juryScores, phase]);

    const scoreDelta = aiAvg ? (Number(juryAvg) - Number(aiAvg)).toFixed(2) : null;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
                {/* Loading Header - Matching Homepage */}
                <div className="w-full px-6 -mt-8 pb-2 bg-slate-50">
                    <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
                        <div className="flex items-center justify-start flex-shrink-0">
                            <Image src="/pes_v2.png" alt="PES" width={300} height={300} className="h-12 w-auto object-contain opacity-50 blur-sm" priority />
                        </div>
                        <div className="flex items-center justify-center flex-1">
                            <Image src="/idealens.png" alt="IdeaLens" width={250} height={100} className="h-36 w-auto object-contain drop-shadow-md opacity-50 blur-sm" priority />
                        </div>
                        <div className="flex items-center justify-end flex-shrink-0">
                            <Image src="/cie.png" alt="CIE" width={300} height={120} className="h-12 w-auto object-contain opacity-50 blur-sm" priority />
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                    <div className="h-12 w-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xl text-slate-500 font-bold uppercase italic tracking-widest animate-pulse">Initializing Interface...</div>
                </div>
            </div>
        );
    }

    if (error || !submission) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans p-8 flex flex-col items-center justify-center">
                <div className="max-w-md w-full glass-card p-12 text-center flex flex-col items-center gap-6 border-rose-100 shadow-2xl">
                    <div className="h-20 w-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Intelligence Node Failed</h2>
                    <p className="text-slate-500 font-medium">{error || "Intelligence Node Not Found"}</p>
                    <button
                        onClick={() => router.push(`/?phase=${phase}`)}
                        className="mt-4 px-8 py-4 rounded-xl bg-slate-900 text-white font-black text-xs uppercase italic tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                    >
                        Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 text-ui-signal-content selection:bg-brand-accent/30 selection:text-white">
            {/* --- UNIFIED HEADER - Matching Homepage --- */}
            <div className="w-full px-6 -mt-8 pb-2 bg-slate-50">
                <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
                    {/* PES Logo + BACK Button */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => router.push(`/?phase=${phase}`)}
                                className="group flex items-center justify-center shrink-0 h-9 w-9 rounded-full transition-all text-slate-700 hover:bg-slate-200 hover:text-brand-accent"
                                title="Go Back"
                            >
                                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <button
                                onClick={() => router.push(`/?phase=${phase}`)}
                                className="group flex items-center justify-center shrink-0 h-9 w-9 rounded-full transition-all text-slate-700 hover:bg-slate-200 hover:text-brand-accent"
                                title="Home Dashboard"
                            >
                                <Home size={18} className="group-hover:scale-105 transition-transform" />
                            </button>
                        </div>
                        <Image src="/pes_v2.png" alt="PES" width={300} height={300} className="h-12 w-auto object-contain" priority />
                    </div>

                    {/* IdeaLens Center */}
                    <div className="flex items-center justify-center flex-1">
                        <Image src="/idealens.png" alt="IdeaLens" width={250} height={100} className="h-36 w-auto object-contain drop-shadow-md" priority />
                    </div>

                    {/* CIE Right */}
                    <div className="flex items-center justify-end flex-shrink-0">
                        <Image src="/cie.png" alt="CIE" width={300} height={120} className="h-12 w-auto object-contain" priority />
                    </div>
                </div>
            </div>

            <main className="w-full max-w-[1700px] mx-auto px-6 lg:px-12 mt-6 pb-20">
                
                {/* SEARCH BAR */}
                <div className="flex justify-center mb-8">
                    <TeamSearchDropdown />
                </div>

                <div className="flex flex-col gap-12">

                    {/* --- TEAM IDENTITY SECTION --- */}
                    <section className="flex items-start gap-4">
                        <div className="h-14 w-1.5 mt-2 bg-brand-accent rounded-full shrink-0"></div>
                        <div className="space-y-3 flex-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 italic tracking-tighter leading-none">
                                    {submission.team_name}
                                </h1>
                                {jurySubmitted && (
                                    <div className="bg-emerald-50 text-emerald-600 font-bold text-sm px-3 py-1.5 rounded-md tracking-wider flex items-center gap-1.5 shadow-sm border border-emerald-100 w-fit">
                                        <CheckCircle2 size={14} />
                                        Evaluated
                                    </div>
                                )}
                            </div>
                            {submission.project_title && submission.project_title !== submission.team_name && (
                                <p className="text-xl font-bold text-slate-500 italic tracking-tight opacity-90">
                                    {submission.project_title}
                                </p>
                            )}
                        </div>
                    </section>

                    {/* --- PARALLEL SIGNALS & SCORING --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                        {/* LEFT: SIGNALS STACK */}
                        <div className="lg:col-span-7 flex flex-col gap-10">
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-2xl font-black italic tracking-tight text-slate-900">Signals</h2>
                                </div>
                                <div className="flex flex-col gap-8">
                                    {['problem_description', 'market_context_signal', 'execution_readiness_signal'].map((key) => {
                                        let value = aiEval?.[key] || submission?.[key];
                                        if (!value) return null;

                                        // Clean up unwanted characters from Google Forms/Sheets flow
                                        if (typeof value === 'string') {
                                            // 1. Remove carriage returns
                                            // 2. Normalize multiple newlines (3+) to double newlines
                                            // 3. Temporarily protect double newlines
                                            // 4. Convert single newlines to spaces
                                            // 5. Restore protected double newlines
                                            value = value.replace(/\r/g, '')
                                                .replace(/\n{3,}/g, '\n\n')
                                                .split('\n\n')
                                                .map(p => p.replace(/\n/g, ' ').trim())
                                                .join('\n\n')
                                                .trim();
                                        }

                                        const isAI = key === 'market_context_signal' || key === 'execution_readiness_signal';
                                        const label = key === 'problem_description'
                                            ? "Problem Description (as per Student submission)"
                                            : formatLabel(key) + (isAI ? " (AI Generated)" : "");

                                        return (
                                            <div key={key} className="flex flex-col border-l-2 border-slate-100 pl-6 py-1">
                                                <div className="pb-1">
                                                    <span className={`font-black tracking-[0.15em] uppercase ${key === 'problem_description' ? 'text-ui-signal-label text-black' : 'text-ui-data-label text-slate-900'}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                                <div className="text-ui-signal-content leading-relaxed text-black whitespace-pre-wrap font-medium">
                                                    {renderValue(value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* --- SUBMISSION DATA (Team Details, Collapsible) --- */}
                            {/* --- SUBMISSION DATA (Team Details, Collapsible) --- */}
                            <details className="group overflow-hidden transition-all duration-300 mt-4 border border-slate-200 bg-white shadow-md rounded-2xl hover:shadow-lg" open>
                                <summary className="cursor-pointer py-6 px-6 flex items-center justify-between text-2xl font-black italic tracking-tight text-slate-900 transition-colors select-none hover:text-brand-accent">
                                    <div className="flex items-center gap-3">
                                        Team Details
                                    </div>
                                    <span className="transition-transform duration-300 group-open:-rotate-180 text-slate-400 group-hover:text-brand-accent">
                                        <ChevronDown size={28} />
                                    </span>
                                </summary>
                                <div className="pb-10 pt-4 px-6 border-t border-slate-100 flex flex-col gap-4">
                                    {(() => {
                                        const sections = [
                                            {
                                                title: "Problem & Solution",
                                                icon: Target,
                                                defaultOpen: true,
                                                keys: ["solution_statement_short", "solution_stage"]
                                            },
                                            {
                                                title: "Customer & Market",
                                                icon: Users,
                                                defaultOpen: false,
                                                keys: ["customer_segments_end_users", "customer_segments_paying_customers", "customer_segments_influencers", "customer_segments_partners", "customer_selection_reason", "target_geography", "target_market_segments"]
                                            },
                                            {
                                                title: "Market Sizing",
                                                icon: PieChart,
                                                defaultOpen: false,
                                                keys: ["tam_total_addressable_market", "sam_serviceable_available_market", "som_serviceable_obtainable_market", "tam", "sam", "som"]
                                            },
                                            {
                                                title: "Product & Validation",
                                                icon: Microscope,
                                                defaultOpen: false,
                                                keys: ["critical_assumptions", "pretypes_used", "pretotypes_used"]
                                            },
                                            {
                                                title: "Competition",
                                                icon: Swords,
                                                defaultOpen: false,
                                                keys: ["competitors", "competitor_positioning"]
                                            },
                                            {
                                                title: "Business Model",
                                                icon: Briefcase,
                                                defaultOpen: false,
                                                keys: ["revenue_model_type", "revenue_model_description", "cost_structure"]
                                            },
                                            {
                                                title: "Value Propositions",
                                                icon: Gem,
                                                defaultOpen: false,
                                                keys: ["customer_value_proposition", "investor_value_proposition"]
                                            }
                                        ];

                                        const excludedKeys = [
                                            'id', 'team_name', 'project_title', 'created_at', 'updated_at',
                                            'submitted_at', 'email', 'track_vertical', 'team_members', 'primary_contact',
                                            'problem_description', 'problem_statement_short',
                                            'pretotyping_done', 'pretotype_experiment_description',
                                            'users_interacted_count', 'key_insights_pivots', 'team_advantage',
                                            'pitch_deck_pdf', 'demo_link', 'preferred_day_16_march',
                                            'preferred_day_17_march', 'preferred_day_18_march', 'preferred_day_any',
                                            'consent_box'
                                        ];

                                        const usedKeys = new Set<string>();
                                        const renderedSections = sections.map((section, idx) => {
                                            const sectionFields = section.keys.filter(k => {
                                                if (submission[k] !== undefined && submission[k] !== null && submission[k] !== '') {
                                                    usedKeys.add(k);
                                                    return true;
                                                }
                                                return false;
                                            });

                                            if (sectionFields.length === 0) return null;

                                            return (
                                                <details key={idx} className="group/sub overflow-hidden border border-slate-100 bg-white shadow-sm rounded-xl transition-all" open={section.defaultOpen}>
                                                    <summary className="cursor-pointer py-4 px-5 flex items-center justify-between text-xl font-bold tracking-tight text-slate-800 transition-colors select-none hover:bg-slate-50">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
                                                                <section.icon size={20} strokeWidth={2.5} />
                                                            </div>
                                                            <span>{section.title}</span>
                                                        </div>
                                                        <span className="transition-transform duration-300 group-open/sub:-rotate-180 text-slate-400">
                                                            <ChevronDown size={20} />
                                                        </span>
                                                    </summary>
                                                    <div className="p-5 pt-0 border-t border-slate-50 mt-1">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mt-6">
                                                            {sectionFields.map(key => {
                                                                let label = formatLabel(key);
                                                                if (key === 'tam_total_addressable_market') label = 'TAM (Total Addressable Market)';
                                                                if (key === 'sam_serviceable_available_market') label = 'SAM (Serviceable Available Market)';
                                                                if (key === 'som_serviceable_obtainable_market') label = 'SOM (Serviceable Obtainable Market)';
                                                                if (key === 'tam') label = 'TAM (Total Addressable Market)';
                                                                if (key === 'sam') label = 'SAM (Serviceable Available Market)';
                                                                if (key === 'som') label = 'SOM (Serviceable Obtainable Market)';
                                                                if (key === 'pretypes_used' || key === 'pretotypes_used') label = 'Pretotypes Used';

                                                                return (
                                                                    <div key={key} className="flex flex-col gap-1.5 h-fit">
                                                                        <span className="text-ui-data-label font-black tracking-widest text-slate-900 uppercase">
                                                                            {label}
                                                                        </span>
                                                                        <div className="text-ui-data-value font-semibold text-slate-700 leading-snug">
                                                                            {renderValue(submission[key])}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </details>
                                            );
                                        });

                                        // Catch all remaining fields
                                        const otherKeys = Object.keys(submission).filter(k => 
                                            !excludedKeys.includes(k) && 
                                            !k.startsWith('preferred_') && 
                                            !usedKeys.has(k) &&
                                            submission[k] !== null && submission[k] !== ''
                                        );

                                        if (otherKeys.length > 0) {
                                            renderedSections.push(
                                                <details key="other" className="group/sub overflow-hidden border border-slate-100 bg-white shadow-sm rounded-xl transition-all">
                                                    <summary className="cursor-pointer py-4 px-5 flex items-center justify-between text-xl font-bold tracking-tight text-slate-800 transition-colors select-none hover:bg-slate-50">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                                                <PlusCircle size={20} strokeWidth={2.5} />
                                                            </div>
                                                            <span>Additional Details</span>
                                                        </div>
                                                        <span className="transition-transform duration-300 group-open/sub:-rotate-180 text-slate-400">
                                                            <ChevronDown size={20} />
                                                        </span>
                                                    </summary>
                                                    <div className="p-5 pt-0 border-t border-slate-50 mt-1">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mt-6">
                                                            {otherKeys.map(key => (
                                                                <div key={key} className="flex flex-col gap-1.5 h-fit">
                                                                    <span className="text-ui-data-label font-black tracking-widest text-slate-900 uppercase">
                                                                        {formatLabel(key)}
                                                                    </span>
                                                                    <div className="text-ui-data-value font-semibold text-slate-700 leading-snug">
                                                                        {renderValue(submission[key])}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </details>
                                            );
                                        }

                                        return renderedSections;
                                    })()}
                                </div>
                            </details>
                        </div>

                        {/* RIGHT: JURY SCORE BOARD (Dynamic Vertical Stack) */}
                        <div className="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-8">
                            <div className="flex flex-col gap-6">
                                <h2 className="text-2xl font-black italic tracking-tight text-[#0F1E2E]">Jury Scoring Board</h2>

                                <div className="flex flex-col gap-4">
                                    {(() => {
                                        const fields: { label: string; key: "d" | "f" | "v" | "m" | "e"; aiKey: string; icon: string }[] = [
                                            { label: "DESIRABILITY", key: "d" as const, aiKey: "desirability_score", icon: "🖤" },
                                            { label: "FEASIBILITY", key: "f" as const, aiKey: "feasibility_score", icon: "🛠️" },
                                            { label: "VIABILITY", key: "v" as const, aiKey: "viability_score", icon: "💰" },
                                        ];
                                        if (phase === "phase3") {
                                            fields.push(
                                                { label: "MARKET CONTEXT", key: "m" as const, aiKey: "market_context_score", icon: "🌐" },
                                                { label: "EXECUTION READINESS", key: "e" as const, aiKey: "execution_readiness_score", icon: "🚀" }
                                            );
                                        }
                                        return fields;
                                    })().map((field) => (
                                        <div key={field.key} className="bg-white rounded-[20px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 flex flex-row items-center justify-between gap-6 transition-transform hover:scale-[1.01] overflow-hidden group">
                                            <div className="flex flex-col gap-1 min-w-[120px]">
                                                <div className="flex items-center gap-2 text-ui-data-label font-black text-slate-900 uppercase tracking-widest leading-none">
                                                    <span className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">{field.icon}</span>
                                                    {field.label}
                                                </div>
                                                {phase === "phase3" ? (
                                                    <div className="mt-2 flex flex-col gap-1">
                                                        <span className="text-ui-micro font-bold text-slate-500 uppercase tracking-widest">Phase 2 Ref</span>
                                                        <div className="flex items-center gap-2 text-ui-micro font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit uppercase tracking-tighter">
                                                            {(() => {
                                                                const missingVal = (field.key === "m" || field.key === "e") ? "N/A" : "-";
                                                                return (
                                                                    <>
                                                                        <span>AI: <span className="font-black text-slate-900">{p2RefAiEval?.[field.aiKey] || missingVal}</span></span>
                                                                        <span className="opacity-50">|</span>
                                                                        <span>Jury: <span className="font-black text-slate-900">{p2RefHumanEval?.[field.aiKey] || missingVal}</span></span>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    jurySubmitted && field.aiKey && aiEval?.[field.aiKey] && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-ui-micro font-bold text-brand-accent/60 uppercase tracking-tighter">AI Score</span>
                                                            <span className="text-ui-tiny font-black text-brand-accent">{aiEval[field.aiKey]}</span>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="flex flex-row items-center gap-4 bg-slate-50/50 rounded-xl px-6 py-2 border border-slate-100">
                                                <input
                                                    type="text"
                                                    disabled={jurySubmitted}
                                                    value={juryScores[field.key]}
                                                    onChange={(e) => setJuryScores({ ...juryScores, [field.key]: e.target.value })}
                                                    className="w-12 text-center text-4xl font-black text-[#0F1E2E] bg-transparent focus:outline-none disabled:opacity-50"
                                                    placeholder={""}
                                                />
                                                <div className="flex flex-col items-center opacity-100 select-none">
                                                    <div className="w-px h-8 bg-slate-400"></div>
                                                    <span className="text-ui-signal-label font-black italic leading-none mt-1 text-black">10</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-4 mt-2">
                                    {!jurySubmitted && (
                                        <button
                                            onClick={handleJurySubmit}
                                            disabled={submittingJury}
                                            className="w-1/2 mx-auto py-3.5 rounded-xl bg-brand-accent text-white font-black text-ui-regular uppercase tracking-[0.2em] shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.15)] hover:bg-brand-blue transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {submittingJury ? "Submitting Analysis..." : "Submit Jury Score"}
                                        </button>
                                    )}

                                    {jurySubmitted && (
                                        <div className="flex flex-col gap-4">
                                            <div className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black text-ui-regular uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                                                <CheckCircle2 size={18} /> Verdict Registered
                                            </div>

                                            {aiAvg && (
                                                <div className="flex flex-col gap-3 w-full">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <div className="flex-1 bg-white rounded-xl px-5 py-3 border border-brand-accent/20 shadow-sm flex items-center justify-between overflow-hidden relative">
                                                            <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-accent/20"></div>
                                                            <span className="text-ui-micro font-black tracking-widest text-[#0F1E2E] uppercase">AI Average</span>
                                                            <span className="text-2xl font-black text-brand-accent italic">{aiAvg}</span>
                                                        </div>
                                                        <div className="flex-1 bg-white rounded-xl px-5 py-3 border border-emerald-500/20 shadow-sm flex items-center justify-between overflow-hidden relative">
                                                            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500/20"></div>
                                                            <span className="text-ui-micro font-black tracking-widest text-[#0F1E2E] uppercase">Jury Average</span>
                                                            <span className="text-2xl font-black text-emerald-600 italic">{juryAvg}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-white rounded-xl px-5 py-3 border border-slate-100 shadow-sm flex items-center justify-between">
                                                        <span className="text-ui-regular font-bold tracking-widest text-slate-900 uppercase">Variance</span>
                                                        <span className="text-xl font-black text-slate-900 border-b-2 border-slate-100">{Math.abs(Number(scoreDelta)).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @keyframes bounce-ultra {
                    0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
                    25% { transform: translateY(-30px) rotate(-5deg) scale(1.05); }
                    75% { transform: translateY(-15px) rotate(5deg) scale(1.02); }
                }
                .animate-bounce-ultra {
                    animation: bounce-ultra 3s cubic-bezier(0.18, 0.89, 0.32, 1.28) infinite;
                }
                @keyframes premium-reveal {
                    from { opacity: 0; transform: translateY(40px); filter: blur(20px); }
                    to { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                .animate-premium {
                    animation: premium-reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div >
    );
}

export default function TeamDetailsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
                {/* Minimal Loading Header */}
                <div className="w-full px-6 -mt-8 pb-2 bg-slate-50">
                    <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
                        <div className="flex items-center justify-start flex-shrink-0">
                            <Image src="/pes_v2.png" alt="PES" width={300} height={300} className="h-12 w-auto object-contain opacity-50 blur-sm" priority />
                        </div>
                        <div className="flex items-center justify-center flex-1">
                            <Image src="/idealens.png" alt="IdeaLens" width={250} height={100} className="h-36 w-auto object-contain drop-shadow-md opacity-50 blur-sm" priority />
                        </div>
                        <div className="flex items-center justify-end flex-shrink-0">
                            <Image src="/cie.png" alt="CIE" width={300} height={120} className="h-12 w-auto object-contain opacity-50 blur-sm" priority />
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-6">
                    <div className="h-12 w-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-lg text-slate-500 font-bold uppercase italic tracking-widest animate-pulse">
                        Synchronizing Intelligence...
                    </div>
                </div>
            </div>
        }>
            <TeamDetailsContent />
        </Suspense>
    );
}