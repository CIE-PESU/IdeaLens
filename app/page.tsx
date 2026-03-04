"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import LogosHeader from "./components/LogosHeader";
import { Search, Check, ArrowRight, Plus, LayoutGrid, List, BarChart3, ChevronRight } from "lucide-react";

type TeamPreview = {
  team_id: string;
  team_name: string | null;
  problem_title: string | null;
  problem_statement: string | null;
  ai_score?: number;
  is_evaluated?: boolean;
  market_readiness?: number;
  execution_risk?: number;
  risk_level?: 'Low' | 'Medium' | 'High';
  alignment?: number;
  innovation_index?: number;
  evaluation_time?: number;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<TeamPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact' | 'comparative'>('compact');
  const [filter, setFilter] = useState<'all' | 'evaluated' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'index'>('index');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch teams
        const { data: submissions, error: subError } = await supabase
          .from("idea_submissions")
          .select("team_id, team_name, problem_title, problem_statement")
          .order("team_name", { ascending: true });

        if (subError) throw subError;

        // Fetch evaluations to determine status and scores
        const { data: evals, error: evalError } = await supabase
          .from("human_evaluations")
          .select("idea_id, desirability_score, feasibility_score, viability_score, presentation_score, evaluation_time");

        const { data: aiEvals, error: aiError } = await supabase
          .from("ai_evaluations")
          .select("team_id, average_dfv_score, execution_risk, market_readiness, feasibility_score, viability_score");

        const humanEvalsMap = new Map((evals || []).map(e => [e.idea_id, e]));
        const aiScoresMap = new Map((aiEvals || []).map(a => [a.team_id, a]));

        const enrichedTeams = (submissions || []).map(team => {
          const aiData = aiScoresMap.get(team.team_id);
          const humanData = humanEvalsMap.get(team.team_id);

          const ai_mr = Number(aiData?.market_readiness || 0);
          const ai_fs = Number(aiData?.feasibility_score || aiData?.execution_risk || 0);
          const ai_vs = Number(aiData?.viability_score || 0);
          const ai_er = Number(aiData?.execution_risk || 0);

          const h_ds = Number(humanData?.desirability_score || 0);
          const h_fs = Number(humanData?.feasibility_score || 0);
          const h_vs = Number(humanData?.viability_score || 0);
          const h_ps = Number(humanData?.presentation_score || 0);

          // Calculate Alignment
          const dev = Math.abs(ai_mr - h_ds) + Math.abs(ai_fs - h_fs) + Math.abs(ai_vs - h_vs) + Math.abs((10 - ai_er) - h_ps);
          const alignment = Math.max(0, Math.min(100, Math.round(100 - (dev * 2.5))));

          // Calculate Index
          const h_avg = (h_ds + h_fs + h_vs + h_ps) / 4;
          const index = Math.round((h_avg * 8) + (alignment * 0.2));

          const riskNum = aiData?.execution_risk ? Number(aiData.execution_risk) : 5;
          let riskLabel: 'Low' | 'Medium' | 'High' = 'Medium';
          if (riskNum < 4) riskLabel = 'Low';
          else if (riskNum > 7) riskLabel = 'High';

          return {
            ...team,
            is_evaluated: !!humanData,
            ai_score: aiData?.average_dfv_score ? Number(aiData.average_dfv_score) : undefined,
            market_readiness: ai_mr,
            execution_risk: ai_er,
            risk_level: riskLabel,
            alignment: alignment,
            innovation_index: index,
            evaluation_time: humanData?.evaluation_time || 0
          };
        });

        setTeams(enrichedTeams as TeamPreview[]);
      } catch (err: any) {
        console.error("Dashboard Intelligence Error:", err);

        // Check for common Cloudflare 404/HTML responses which indicate proxy issues
        const errorMsg = err.message || String(err);
        if (errorMsg.includes("<!DOCTYPE html>") || errorMsg.includes("404")) {
          setError("Connection Error: The backend service is currently unreachable via proxy. Please ensure direct Supabase access is configured.");
        } else {
          setError(`Failed to load intelligence: ${errorMsg}`);
        }
      } finally {
        setLoading(false);
      }
    };

    // Load viewMode from localStorage
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('ideaLensViewMode') as 'detailed' | 'compact';
      if (savedViewMode) setViewMode(savedViewMode);
    }

    fetchData();
  }, []);

  // Persist viewMode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ideaLensViewMode', viewMode);
    }
  }, [viewMode]);

  const stats = useMemo(() => {
    const total = teams.length;
    const evaluated = teams.filter(t => t.is_evaluated).length;
    const progress = total > 0 ? (evaluated / total) * 100 : 0;
    return { total, evaluated, progress };
  }, [teams]);

  const processedTeams = useMemo(() => {
    let result = teams.filter((team) =>
      (team.team_name || "").toLowerCase().includes(query.toLowerCase())
    );

    if (filter === 'evaluated') result = result.filter(t => t.is_evaluated);
    if (filter === 'pending') result = result.filter(t => !t.is_evaluated);

    if (sortBy === 'score') {
      result = [...result].sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
    } else if (sortBy === 'index') {
      result = [...result].sort((a, b) => (b.innovation_index || 0) - (a.innovation_index || 0));
    } else {
      result = [...result].sort((a, b) => (a.team_name || "").localeCompare(b.team_name || ""));
    }

    return result.filter(team => team.team_id && !['placeholder', 'view', 'fallback', 'index'].includes(team.team_id));
  }, [teams, query, filter, sortBy]);

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-accent/30">

      {/* Logos Container */}
      <LogosHeader />

      <main className="w-full px-12 mt-6 pb-10">

        {/* SEARCH BAR (OUTSIDE HEADER) */}
        <div className="flex justify-center mb-16">
          <div className="relative w-full max-w-xl group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team name"
              className="w-full bg-white rounded-2xl border border-slate-200 px-8 py-4 text-lg shadow-sm group-hover:shadow-md focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all placeholder:text-slate-300 font-medium italic"
            />
            <Search className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-hover:text-brand-accent transition-colors" />
          </div>
        </div>

        {/* PROGRESS & VIEW CONTROLS */}
        <section className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-100 pb-12">
          <div className="flex-1 space-y-4 max-w-lg">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em]">
              <span className="text-slate-400">Global Evaluation Progress</span>
              <span className="text-brand-accent">{stats.evaluated} / {stats.total} TEAMS</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-accent transition-all duration-1000 ease-out"
                style={{ width: `${stats.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
            <button
              onClick={() => setViewMode('detailed')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest ${viewMode === 'detailed' ? 'bg-white shadow-md text-brand-blue border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Detailed
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest ${viewMode === 'compact' ? 'bg-white shadow-md text-brand-blue border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Compact
            </button>
            <button
              onClick={() => setViewMode('comparative')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest ${viewMode === 'comparative' ? 'bg-white shadow-md text-brand-blue border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Comparative
            </button>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-slate-200/50 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card p-12 text-center text-rose-600 font-bold border-rose-100">
            {error}
          </div>
        ) : processedTeams.length === 0 ? (
          <div className="glass-card p-24 text-center text-slate-400 italic">
            No intelligence matches found for your current filter parameters.
          </div>
        ) : (
          <div className="flex flex-col">
            {processedTeams.map((team, index) => (
              <Link
                key={team.team_id}
                href={`/idea/${encodeURIComponent(team.team_id)}`}
                className="group flex items-center justify-between py-6 border-b border-slate-100 hover:bg-slate-50/50 transition-all px-4"
              >
                {/* Left Section: Logo & Name */}
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden relative group-hover:scale-105 transition-transform">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]"></div>
                    <span className="text-2xl font-black text-white/30 uppercase italic">
                      {team.team_name?.charAt(0) || "T"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-slate-900 uppercase italic group-hover:text-brand-accent transition-colors tracking-tight">
                        {team.team_name || "Nexus Prototype"}
                      </h3>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${team.risk_level === 'Low' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        team.risk_level === 'High' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                          'bg-amber-50 border-amber-100 text-amber-600'
                        }`}>
                        {team.risk_level} RISK
                      </span>
                    </div>
                    {viewMode === 'detailed' && (
                      <p className="text-xs font-bold text-slate-400 italic max-w-lg truncate mt-1">
                        {team.problem_title || "No executive summary available for this intelligence node."}
                      </p>
                    )}
                    {viewMode === 'comparative' && (
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Index: <span className="text-slate-900">{team.innovation_index}%</span></span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Align: <span className="text-slate-900">{team.alignment}%</span></span>
                        {team.ai_score && <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter text-brand-accent">AI: {team.ai_score.toFixed(1)}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Section: Indicators & Actions */}
                <div className="flex items-center gap-10">
                  {team.is_evaluated && (
                    <div className="hidden sm:flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.15em]">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check size={10} strokeWidth={4} />
                      </div>
                      Evaluated
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-slate-300 group-hover:text-brand-accent transition-all">
                    <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* PORTFOLIO HEATMAP */}
        {viewMode === 'comparative' && !loading && processedTeams.length > 0 && (
          <section className="mt-20 animate-advanced-reveal">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-brand-teal flex items-center justify-center text-white shadow-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Portfolio Intelligence Heatmap</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cross-team performance distribution matrix</p>
                </div>
              </div>

              {/* QUALITATIVE PERFORMANCE LEGEND */}
              <div className="flex items-center gap-6 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Low Performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Moderate Performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">High Performance</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Metric Module</th>
                      {processedTeams.map(t => (
                        <th key={t.team_id} className="p-6 text-[10px] font-black text-slate-900 uppercase tracking-widest min-w-[120px] text-center border-l border-slate-100/50">
                          {t.team_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Innovation Index', 'Market Alignment', 'Readiness Score', 'Evaluation Velocity'].map((metric, i) => (
                      <tr key={metric} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                        <td className="p-6 text-sm font-black text-slate-900 uppercase italic">{metric}</td>
                        {processedTeams.map(t => {
                          const value =
                            metric === 'Innovation Index' ? t.innovation_index || 0 :
                              metric === 'Market Alignment' ? t.alignment || 0 :
                                metric === 'Readiness Score' ? (t.market_readiness || 0) * 10 :
                                  Math.min(100, (t.evaluation_time || 0));

                          let lineColor = 'bg-red-500';
                          let label = 'Low Performance';

                          if (value >= 70) {
                            lineColor = 'bg-emerald-500';
                            label = 'High Performance';
                          } else if (value >= 40) {
                            lineColor = 'bg-amber-500';
                            label = 'Moderate Performance';
                          }

                          return (
                            <td key={t.team_id} className="p-6 border-l border-slate-100/50">
                              <div className="flex flex-col gap-2 group/cell relative cursor-help">
                                <div className="flex items-center gap-3">
                                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex-1">
                                    <div
                                      className={`h-full ${lineColor} rounded-full transition-all duration-1000 ease-out`}
                                      style={{ width: `${value}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-black text-slate-900 w-8">{value}%</span>
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[9px] rounded-lg opacity-0 group-hover/cell:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-xl">
                                  {label}: {value}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

    </div>
  );
}
