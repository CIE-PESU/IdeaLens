"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import LogosHeader from "../../components/LogosHeader";
import { ArrowLeft, Target, Zap, TrendingUp, Sparkles, AlertTriangle, Users, Heart, Hammer, MessageSquare, Send, CheckCircle2 } from "lucide-react";

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
                    desirability_score: juryScores.d,
                    feasibility_score: juryScores.f,
                    viability_score: juryScores.v,
                    overall_comments: juryFeedback,
                    evaluated_at: new Date().toISOString()
                });

            if (insertError) throw insertError;

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
            console.error("Submission failed:", err);
            alert(`Submission failed: ${err.message}`);
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
        if (delta > 0) return "😄";
        if (delta < -2.5) return "😵‍💫"; // Confused if jury much lower
        if (delta < 0) return "😠";
        if (Math.abs(delta) < 0.25) return "🤩";
        return "🤔";
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

                {/* --- SUBMISSION DATA (MIDDLE) --- */}
                <section className="mb-24">
                    <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden p-16 hover:shadow-md transition-shadow duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
                            {Object.entries(submission).map(([key, value]) => {
                                // Exclude metadata keys as they are highlighted in header/system info
                                if (['id', 'team_name', 'project_title', 'created_at', 'updated_at'].includes(key)) return null;

                                const isLongText = typeof value === 'string' && value.length > 200;
                                const spanClass = isLongText ? "md:col-span-2" : "";

                                return (
                                    <div key={key} className={`flex flex-col gap-4 ${spanClass} pb-8 border-b border-slate-50 last:border-b-0`}>
                                        <span className="text-lg font-black uppercase tracking-[0.3em] text-black">
                                            {formatLabel(key)}
                                        </span>
                                        <div className="text-base leading-relaxed text-slate-700">
                                            {renderValue(value)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* --- EVALUATION SECTION (BOTTOM) --- */}
                <section className="space-y-12 pt-20 border-t border-slate-200">
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

                        {/* AI Comparison (Prominent White Card) */}
                        <div className="flex flex-col">
                            <div className="flex-1 bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                                {!jurySubmitted ? (
                                    <div className="space-y-10 relative z-10 px-8">
                                        <div className="h-32 w-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-4 border-dashed border-slate-100 relative">
                                            <AlertTriangle size={48} className="text-slate-200" />
                                            <div className="absolute inset-0 rounded-full border-4 border-slate-100 animate-ping opacity-20"></div>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black uppercase tracking-[0.6em] text-slate-300">Analysis Encrypted</h3>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full space-y-16 animate-premium relative z-10">
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-brand-accent italic">AI SCORE</h3>
                                            <div className="h-1.5 w-16 bg-brand-accent/30 mx-auto rounded-full"></div>
                                        </div>

                                        <div className="space-y-12">
                                            <div className="flex flex-col gap-4">
                                                <div className="text-9xl font-black italic tracking-tighter text-slate-900 drop-shadow-sm">{aiAvg || "N/A"}</div>
                                            </div>

                                            {aiAvg && (
                                                <div className="pt-12 border-t border-slate-50 flex flex-col items-center gap-10">
                                                    <div className="flex flex-col items-center gap-10 group/score">
                                                        <div className={`text-6xl font-black italic transition-all group-hover/score:scale-110 ${Number(scoreDelta) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {Number(scoreDelta) >= 0 ? '+' : ''}{scoreDelta}
                                                        </div>
                                                        <span className="text-[10rem] animate-bounce-ultra select-none drop-shadow-2xl hover:scale-110 transition-transform duration-500">
                                                            {getEmoji(Number(scoreDelta))}
                                                        </span>
                                                    </div>
                                                    <div className="px-10 py-3 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.4em] italic shadow-xl">
                                                        Intelligence Variance
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
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
