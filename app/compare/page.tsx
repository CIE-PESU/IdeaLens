"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ComparisonPage() {
    const router = useRouter();
    const [teams, setTeams] = useState<any[]>([]);
    const [selection, setSelection] = useState<[string, string]>(["", ""]);
    const [data, setData] = useState<[any | null, any | null]>([null, null]);

    useEffect(() => {
        const fetchTeams = async () => {
            const { data } = await supabase.from("idealens_submissions2").select("id, team_name");
            setTeams(data || []);
        };
        fetchTeams();
    }, []);

    const fetchTeamData = async (index: number, id: string) => {
        if (!id) return;
        const { data: res } = await supabase.from("ai_evaluations").select("*").eq("team_id", id).maybeSingle();
        setData(prev => {
            const next = [...prev] as [any | null, any | null];
            next[index] = res;
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-10 space-y-12">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="p-3 rounded-2xl glass-card hover:bg-slate-100 transition-all font-bold">&larr; HUB</button>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">Dual-Unit <span className="text-brand-accent">Comparison</span></h1>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {[0, 1].map(idx => (
                    <div key={idx} className="space-y-6">
                        <select
                            value={selection[idx]}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelection(prev => {
                                    const next = [...prev] as [string, string];
                                    next[idx] = val;
                                    return next;
                                });
                                fetchTeamData(idx, val);
                            }}
                            className="w-full glass-card p-6 outline-none font-black uppercase text-sm italic tracking-widest text-brand-blue"
                        >
                            <option value="">SELECT INTELLIGENCE NODE</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                        </select>

                        {data[idx] ? (
                            <div className="glass-card p-10 space-y-10 animate-premium">
                                <div className="text-center">
                                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-2">Overall Score</div>
                                    <div className="text-7xl font-black italic text-slate-900">{Number(data[idx].average_dfv_score).toFixed(1)}</div>
                                </div>

                                <div className="space-y-6">
                                    <MetricBar label="Desirability" value={data[idx].desirability_score} color="bg-rose-500" />
                                    <MetricBar label="Feasibility" value={data[idx].feasibility_score} color="bg-blue-500" />
                                    <MetricBar label="Viability" value={data[idx].viability_score} color="bg-emerald-500" />
                                    <MetricBar label="Market readiness" value={data[idx].market_readiness} color="bg-brand-accent" />
                                </div>

                                <div className="pt-6 border-t border-dashed border-slate-200">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">Executive Intelligence</div>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed italic">{data[idx].summary?.slice(0, 200)}...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-96 glass-card border-dashed flex items-center justify-center text-slate-300 font-black italic uppercase tracking-widest">Awaiting Node Selection</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricBar({ label, value, color }: { label: string, value: any, color: string }) {
    const num = Number(value) || 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span>{label}</span>
                <span>{num.toFixed(1)}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${num * 10}%` }}></div>
            </div>
        </div>
    );
}
