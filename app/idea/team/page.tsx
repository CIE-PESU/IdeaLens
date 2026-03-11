"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
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
                    .order('evaluated_at', { ascending: false })
                    .limit(1)
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
                <header className="w-full px-6 md:px-12 py-3 flex items-center justify-between" style={{ zoom: 0.9 }}>
                    <div className="flex items-center gap-8 md:gap-12 w-1/3">
                        <img src="/pes_v2.png" alt="PES" className="h-10 md:h-14 w-auto object-contain opacity-50 blur-sm" />
                    </div>
                    <div className="w-1/3 flex border-x border-transparent justify-center">
                        <img src="/idealens.png" alt="IdeaLens" className="h-16 md:h-24 w-auto object-contain scale-[1.2] origin-center opacity-50 blur-sm" />
                    </div>
                    <div className="w-1/3 flex justify-end">
                        <img src="/cie.png" alt="CIE" className="h-10 md:h-12 w-auto object-contain opacity-50 blur-sm" />
                    </div>
                </header>
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
        <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 text-[17px] selection:bg-brand-accent/30 selection:text-white">
            {/* --- UNIFIED HEADER --- */}
            <header className="w-full px-6 md:px-12 py-3 flex items-center justify-between" style={{ zoom: 0.9 }}>
                <div className="flex items-center gap-8 md:gap-12 w-1/3">
                    <button
                        onClick={() => router.push('/')}
                        className="group flex items-center shrink-0 gap-2 py-2 transition-all text-xs font-black uppercase tracking-widest text-slate-700 hover:text-brand-accent"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>
                    <img src="/pes_v2.png" alt="PES" className="h-10 md:h-14 w-auto object-contain" />
                </div>
                
                <div className="w-1/3 flex border-x border-transparent justify-center">
                    <img src="/idealens.png" alt="IdeaLens" className="h-16 md:h-24 w-auto object-contain scale-[1.2] origin-center" />
                </div>
                
                <div className="w-1/3 flex justify-end">
                    <img src="/cie.png" alt="CIE" className="h-10 md:h-12 w-auto object-contain" />
                </div>
            </header>

            <main className="w-full max-w-[1700px] mx-auto px-6 lg:px-12 mt-6 pb-20" style={{ zoom: 0.9 }}>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* ========================================================= */}
                    {/* LEFT COLUMN: Identity, Signals, Team Details */}
                    {/* ========================================================= */}
                    <div className="xl:col-span-9 flex flex-col gap-6">
                        
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

                        {/* --- SIGNALS --- */}
                        {(aiEval?.market_context_signal || aiEval?.execution_readiness_signal || submission?.market_context_signal || submission?.execution_readiness_signal || submission?.problem_description || submission?.problem_statement_short) && (
                            <section className="mt-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-2xl font-black italic tracking-tight text-slate-900">Signals</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['market_context_signal', 'execution_readiness_signal', 'problem_description', 'problem_statement_short'].map((key) => {
                                        const value = aiEval?.[key] || submission?.[key];
                                        if (!value) return null;

                                        return (
                                            <div key={key} className="flex flex-col">
                                                <div className="py-2">
                                                    <span className="text-[14px] font-black tracking-widest text-slate-800">
                                                        {formatLabel(key)}
                                                    </span>
                                                </div>
                                                <div className="py-2 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-medium flex-1">
                                                    {renderValue(value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* --- SUBMISSION DATA (Team Details, Collapsible) --- */}
                        <details className="group overflow-hidden transition-all duration-300 mt-4">
                            <summary className="cursor-pointer py-4 flex items-center justify-between text-2xl font-black italic tracking-tight text-slate-900 border-b border-slate-300 transition-colors select-none">
                                Team Details
                                <span className="transition-transform duration-300 group-open:-rotate-180 text-slate-400">
                                    <ChevronDown size={24} />
                                </span>
                            </summary>
                            <div className="py-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                                    {Object.entries(submission).map(([key, value]) => {
                                        const excludedKeys = [
                                            'id', 'team_name', 'project_title', 'created_at', 'updated_at', 
                                            'submitted_at', 'email', 'track_vertical', 'team_members', 'primary_contact', 
                                            'problem_statement_short', 'problem_description', 'problem_statement', 
                                            'pretotyping_done', 'pretypes_used', 'pretotype_experiment_description', 
                                            'users_interacted_count', 'key_insights_pivots', 'team_advantage', 
                                            'pitch_deck_pdf', 'demo_link', 'preferred_day_16_march', 
                                            'preferred_day_17_march', 'preferred_day_18_march', 'preferred_day_any', 
                                            'consent_box'
                                        ];
                                        if (excludedKeys.includes(key) || key.startsWith('preferred_') || key === 'consent_box') return null;

                                        return (
                                            <details key={key} className="group/item transition-all h-fit">
                                                <summary className="cursor-pointer py-2 flex items-center justify-between transition-colors select-none">
                                                    <span className="text-[14px] font-black tracking-widest text-slate-800">
                                                        {formatLabel(key)}
                                                    </span>
                                                    <span className="transition-transform duration-200 group-open/item:-rotate-180 text-slate-400">
                                                        <ChevronDown size={16} />
                                                    </span>
                                                </summary>
                                                <div className="pb-4 pt-2 text-sm leading-relaxed text-slate-700">
                                                    {renderValue(value)}
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            </div>
                        </details>

                    </div>

                    {/* ========================================================= */}
                    {/* RIGHT COLUMN: DFV Grid, AI Score */}
                    {/* ========================================================= */}
                    <div className="xl:col-span-3 flex flex-col gap-6 h-fit self-start xl:sticky xl:top-6">
                        
                        {/* --- JURY SCORE BOARD --- */}
                        <div className="bg-white/85 backdrop-blur-[12px] rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)] text-slate-900" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                            <h2 className="text-lg font-black italic tracking-tight mb-4">Jury Scoring</h2>
                            
                            {/* COMPACT DFV GRID */}
                            <div className="space-y-2.5">
                                {[
                                    { label: "Desirability", key: "d" as const, aiKey: "desirability_score", icon: <Heart size={14} className="text-amber-400" />, color: "bg-slate-50/50 border-slate-200" },
                                    { label: "Feasibility", key: "f" as const, aiKey: "feasibility_score", icon: <Hammer size={14} className="text-emerald-400" />, color: "bg-slate-50/50 border-slate-200" },
                                    { label: "Viability", key: "v" as const, aiKey: "viability_score", icon: <TrendingUp size={14} className="text-indigo-400" />, color: "bg-slate-50/50 border-slate-200" },
                                ].map((field) => (
                                    <div key={field.key} className={`p-3 rounded-xl border ${field.color} flex flex-col gap-1.5 relative overflow-hidden group hover:bg-slate-50 transition-colors`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500">
                                                {field.icon}
                                                {field.label}
                                            </div>
                                            <span className="text-lg font-black italic">{juryScores[field.key]}</span>
                                        </div>
                                        
                                        <div className="relative pt-1 pb-1">
                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                step="0.5"
                                                disabled={jurySubmitted}
                                                value={juryScores[field.key]}
                                                onChange={(e) => setJuryScores({ ...juryScores, [field.key]: parseFloat(e.target.value) })}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {jurySubmitted && aiEval?.[field.aiKey] && (
                                            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 mt-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-accent tracking-widest">
                                                    <Sparkles size={10} /> Ai score
                                                </div>
                                                <span className="text-xs font-black italic text-brand-accent">{aiEval[field.aiKey]}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                                {/* AI OVERVIEW SUMMARY */}
                                {!jurySubmitted ? (
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center gap-2">
                                        <AlertTriangle size={18} className="text-slate-400" />
                                        <h3 className="text-[11px] font-black tracking-[0.1em] text-slate-500 text-center">Ai analysis encrypted</h3>
                                    </div>
                                ) : (
                                    <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-xl p-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <Sparkles size={40} />
                                        </div>
                                        <div className="relative z-10 space-y-2.5">
                                            <div className="flex justify-between items-center bg-white/60 rounded-lg p-2.5">
                                                <span className="text-[11px] font-black tracking-widest text-brand-accent flex items-center gap-1.5">
                                                    <Sparkles size={12} /> Ai avg
                                                </span>
                                                <span className="text-lg font-black italic text-slate-900">{aiAvg || "N/A"}</span>
                                            </div>
                                            
                                            {aiAvg && (
                                                <div className="flex justify-between items-center bg-white/60 rounded-lg p-2.5">
                                                    <span className="text-[11px] font-bold tracking-widest text-slate-500">Variance</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-black italic text-slate-900">{Math.abs(Number(scoreDelta)).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!jurySubmitted ? (
                                    <button
                                        onClick={handleJurySubmit}
                                        disabled={submittingJury}
                                        className="w-full py-3 rounded-xl bg-brand-accent text-white font-black text-[11px] italic tracking-widest shadow-lg hover:bg-brand-blue transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {submittingJury ? "Submitting..." : "Submit verification"}
                                    </button>
                                ) : (
                                    <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-black text-[11px] italic tracking-widest flex items-center justify-center gap-2">
                                        <CheckCircle2 size={14} /> Verdict registered
                                    </div>
                                )}
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
                <header className="w-full px-6 py-3 bg-white border-b border-slate-200 shadow-sm flex justify-center">
                    <img src="/idealens.png" alt="IdeaLens" className="h-16 blur-sm opacity-50 w-auto object-contain" />
                </header>
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
