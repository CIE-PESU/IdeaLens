"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import LogosHeader from "../../components/LogosHeader";
import { ArrowLeft, Target, Zap, TrendingUp, Sparkles, AlertTriangle, Users, Heart, Hammer, MessageSquare, Send, CheckCircle2, ChevronDown } from "lucide-react";

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

function TeamDetailsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");

    const [loading, setLoading] = useState(true);
    const [submission, setSubmission] = useState<any | null>(null);
    const [humanEval, setHumanEval] = useState<any | null>(null);
    const [aiEval, setAiEval] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Jury Form State
    const [juryScores, setJuryScores] = useState({ d: 5, f: 5, v: 5 });
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

                // 2. Fetch human eval if exists
                const { data: hData } = await supabase
                    .from("human_evaluations")
                    .select("*")
                    .eq("idea_id", id)
                    .maybeSingle();

                if (hData) {
                    setHumanEval(hData);
                    setJurySubmitted(true);
                    setJuryScores({
                        d: hData.desirability_score || 5,
                        f: hData.feasibility_score || 5,
                        v: hData.viability_score || 5
                    });
                    setJuryFeedback(hData.overall_comments || "");
                }

                // 3. Fetch AI eval if exists
                const { data: aData } = await supabase
                    .from("ai_evaluations")
                    .select("*")
                    .eq("team_id", id) // Based on DB inspection showing team_id as FK
                    .maybeSingle();

                if (aData) setAiEval(aData);

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
            // Use insert since there's no unique constraint on idea_id
            const { error: insertError } = await supabase
                .from("human_evaluations")
                .insert({
                    idea_id: id,
                    team_name: submission.team_name,
                    desirability_score: Math.round(juryScores.d),
                    feasibility_score: Math.round(juryScores.f),
                    viability_score: Math.round(juryScores.v),
                    overall_comments: juryFeedback,
                    evaluated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error("Raw Insert Error:", JSON.stringify(insertError));
                throw insertError;
            }

            // Update local state to show "Submitted" and fetch the created record
            const { data: updatedHData } = await supabase
                .from("human_evaluations")
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

    const juryAvg = useMemo(() => {
        return ((juryScores.d + juryScores.f + juryScores.v) / 3).toFixed(2);
    }, [juryScores]);

    const aiAvg = aiEval ? Number(aiEval.average_dfv_score).toFixed(2) : null;
    const scoreDelta = aiAvg ? (Number(juryAvg) - Number(aiAvg)).toFixed(2) : null;

    const getEmoji = (delta: number) => {
        if (delta > 1) return "🤩";
        if (delta > 0) return "😄";
        if (delta > -0.5) return "🧐";
        if (delta > -1.5) return "🤨";
        return "😵‍💫";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                <LogosHeader />
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
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
                        onClick={() => router.push('/')}
                        className="mt-4 px-8 py-4 rounded-xl bg-slate-900 text-white font-black text-xs uppercase italic tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                    >
                        Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-accent/30 selection:text-white">
            <LogosHeader />

            <main className="w-full px-12 mt-0 pb-20">
                {/* Modern Navigation Header */}
                <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-100">
                    <button
                        onClick={() => router.push('/')}
                        className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-accent/30 transition-all text-[11px] font-black uppercase tracking-[0.2em] text-black hover:text-brand-accent"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>

                </div>

                {/* --- TEAM IDENTITY SECTION (TOP) --- */}
                <header className="mb-12">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-2 bg-brand-accent rounded-full shadow-lg shadow-brand-accent/20"></div>
                        <div className="space-y-2">
                            <h1 className="text-7xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                                {submission.team_name}
                            </h1>
                            {submission.project_title && submission.project_title !== submission.team_name && (
                                <p className="text-xl font-bold text-slate-400 uppercase italic tracking-tight opacity-80">
                                    {submission.project_title}
                                </p>
                            )}
                        </div>
                    </div>
                </header>

                {/* --- EVALUATION SECTION (Now under Team Identity) --- */}
                <section className="space-y-12 mb-24">
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-2 bg-slate-900 rounded-full"></div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tight text-slate-900">JURY SCORE BOARD</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Separate Metric Cards (White & Interactive) */}
                        <div className="lg:col-span-2 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { label: "Desirability", key: "d" as const, icon: <Heart size={20} className="text-amber-400" />, color: "border-amber-100/50" },
                                    { label: "Feasibility", key: "f" as const, icon: <Hammer size={20} className="text-emerald-400" />, color: "border-emerald-100/50" },
                                    { label: "Viability", key: "v" as const, icon: <TrendingUp size={20} className="text-indigo-400" />, color: "border-indigo-100/50" },
                                ].map((field) => (
                                    <div key={field.key} className={`bg-white p-8 rounded-[2.5rem] border ${field.color} shadow-sm space-y-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                {field.icon}
                                                {field.label}
                                            </div>
                                            <span className="text-3xl font-black italic text-slate-900 group-hover:scale-110 transition-transform">{juryScores[field.key]}</span>
                                        </div>
                                        <div className="relative pt-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                step="0.5"
                                                disabled={jurySubmitted}
                                                value={juryScores[field.key]}
                                                onChange={(e) => setJuryScores({ ...juryScores, [field.key]: parseFloat(e.target.value) })}
                                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                                            />
                                            <div className="flex justify-between mt-2 px-1">
                                                <span className="text-[9px] font-bold text-slate-200">0</span>
                                                <span className="text-[9px] font-bold text-slate-200">10</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!jurySubmitted ? (
                                <button
                                    onClick={handleJurySubmit}
                                    disabled={submittingJury}
                                    className="w-fit px-12 mx-auto py-7 rounded-[2rem] bg-slate-900 text-white font-black text-sm uppercase italic tracking-[0.4em] shadow-2xl hover:bg-brand-blue transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50 group"
                                >
                                    {submittingJury ? "Submitting..." : "Submit"}
                                </button>
                            ) : (
                                <div className="w-full py-7 rounded-[2rem] bg-emerald-50 border border-emerald-100 text-emerald-600 font-black text-sm uppercase italic tracking-[0.4em] flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                                    <CheckCircle2 size={24} /> Official Verdict Registered ✅
                                </div>
                            )}
                        </div>

                        {/* AI Comparison */}
                        <div className="flex flex-col h-full">
                            <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-brand-accent/20 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                                {!jurySubmitted ? (
                                    <div className="space-y-6 relative z-10 flex flex-col items-center justify-center h-full">
                                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center border-4 border-dashed border-slate-100 relative">
                                            <AlertTriangle size={32} className="text-slate-200" />
                                            <div className="absolute inset-0 rounded-full border-4 border-slate-100 animate-ping opacity-20"></div>
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.6em] text-slate-300">Analysis Encrypted</h3>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col justify-between animate-premium relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent">
                                                <Sparkles size={20} className="text-brand-accent" />
                                                AI SCORE
                                            </div>
                                            <span className="text-5xl font-black italic text-slate-900 group-hover:scale-110 transition-transform origin-top-right">{aiAvg || "N/A"}</span>
                                        </div>

                                        {aiAvg && (
                                            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Score Variance</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{getEmoji(Number(scoreDelta))}</span>
                                                        <span className={`text-4xl font-black italic transition-all group-hover:scale-110 origin-right ${Number(scoreDelta) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {Math.abs(Number(scoreDelta)).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-bold bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-center leading-relaxed">
                                                    AI Avg: <span className="text-slate-900">{aiAvg}</span> | Jury Avg: <span className="text-slate-900">{juryAvg}</span><br />
                                                    Final Difference: <span className={Number(scoreDelta) >= 0 ? "text-emerald-600" : "text-rose-600"}>{Math.abs(Number(scoreDelta)).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- SIGNALS (Collapsible) --- */}
                {(aiEval?.market_context_signal || aiEval?.execution_readiness_signal || submission?.market_context_signal || submission?.execution_readiness_signal) && (
                    <section className="mb-24 pt-12 border-t border-slate-200">
                        <details className="group bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden hover:shadow-md transition-all duration-500">
                            <summary className="cursor-pointer p-10 flex items-center justify-between text-4xl font-black uppercase italic tracking-tight text-slate-900 border-b border-transparent group-open:border-slate-100 group-open:bg-slate-50/50 transition-colors select-none">
                                <span className="flex items-center gap-6">
                                    <div className="h-12 w-2 bg-brand-accent rounded-full"></div>
                                    SIGNALS
                                </span>
                                <span className="transition-transform duration-300 group-open:-rotate-180 text-slate-400">
                                    <ChevronDown size={40} />
                                </span>
                            </summary>
                            <div className="p-16">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    {['market_context_signal', 'execution_readiness_signal'].map((key) => {
                                        const value = aiEval?.[key] || submission?.[key];
                                        if (!value) return null;

                                        return (
                                            <details key={key} className="group/item border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all h-fit">
                                                <summary className="cursor-pointer px-8 py-6 flex items-center justify-between transition-colors select-none group-open/item:bg-slate-50 group-open/item:rounded-t-2xl">
                                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">
                                                        {formatLabel(key)}
                                                    </span>
                                                    <span className="transition-transform duration-300 group-open/item:-rotate-180 text-slate-400">
                                                        <ChevronDown size={20} />
                                                    </span>
                                                </summary>
                                                <div className="px-8 pb-8 pt-4 text-base leading-relaxed text-slate-700 bg-white group-open/item:rounded-b-2xl border-t border-slate-50 whitespace-pre-wrap font-medium">
                                                    {renderValue(value)}
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            </div>
                        </details>
                    </section>
                )}

                {/* --- SUBMISSION DATA (Team Details, Collapsible) --- */}
                <section className="mb-24 pt-12 border-t border-slate-200">
                    <details className="group bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden hover:shadow-md transition-all duration-500">
                        <summary className="cursor-pointer p-10 flex items-center justify-between text-4xl font-black uppercase italic tracking-tight text-slate-900 border-b border-transparent group-open:border-slate-100 group-open:bg-slate-50/50 transition-colors select-none">
                            <span className="flex items-center gap-6">
                                <div className="h-12 w-2 bg-slate-900 rounded-full"></div>
                                TEAM DETAILS
                            </span>
                            <span className="transition-transform duration-300 group-open:-rotate-180 text-slate-400">
                                <ChevronDown size={40} />
                            </span>
                        </summary>
                        <div className="p-16">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {Object.entries(submission).map(([key, value]) => {
                                    // Exclude metadata keys and specific requested keys
                                    const excludedKeys = [
                                        'id', 'team_name', 'project_title', 'created_at', 'updated_at',
                                        // Specific UI details to remove (From screenshots)
                                        'submitted_at', 'email', 'track_vertical', 'team_members',
                                        'primary_contact', 'problem_statement_short', 'pretotyping_done', 'pretypes_used',
                                        'pretotype_experiment_description', 'users_interacted_count', 'key_insights_pivots',
                                        'team_advantage', 'pitch_deck_pdf', 'demo_link',
                                        'preferred_day_16_march', 'preferred_day_17_march', 'preferred_day_18_march',
                                        'preferred_day_any', 'consent_box'
                                    ];

                                    if (excludedKeys.includes(key) || key.startsWith('preferred_') || key === 'consent_box') return null;

                                    return (
                                        <details key={key} className="group/item border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all h-fit">
                                            <summary className="cursor-pointer px-8 py-6 flex items-center justify-between transition-colors select-none group-open/item:bg-slate-50 group-open/item:rounded-t-2xl">
                                                <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">
                                                    {formatLabel(key)}
                                                </span>
                                                <span className="transition-transform duration-300 group-open/item:-rotate-180 text-slate-400">
                                                    <ChevronDown size={20} />
                                                </span>
                                            </summary>
                                            <div className="px-8 pb-8 pt-4 text-base leading-relaxed text-slate-700 bg-white group-open/item:rounded-b-2xl border-t border-slate-50">
                                                {renderValue(value)}
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        </div>
                    </details>
                </section>
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
            <div className="min-h-screen bg-slate-50 font-sans">
                <LogosHeader />
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <div className="h-12 w-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xl text-slate-500 font-bold uppercase italic tracking-widest animate-pulse">
                        Synchronizing Intelligence...
                    </div>
                </div>
            </div>
        }>
            <TeamDetailsContent />
        </Suspense>
    );
}
