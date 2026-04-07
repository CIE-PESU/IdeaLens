"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import LogosHeader from "./components/LogosHeader";
import { Search, Check, X, ArrowRight, Plus, LayoutGrid, List, BarChart3, ChevronRight } from "lucide-react";
import { getSmartSummary } from "./utils/teamSummaries";

type TeamPreview = {
  id: string;
  team_name: string | null;
  email: string | null;
  submitted_at: string | null;
  problem_statement_short?: string | null;
  team_members?: string | null;
  isEvaluated?: boolean;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<TeamPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact' | 'comparative'>('compact');
  const [filter, setFilter] = useState<'all' | 'evaluated' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'index'>('name');
  const [phase, setPhase] = useState<"phase2" | "phase3">("phase2");
  const [phase3TeamNames, setPhase3TeamNames] = useState<string[]>([]);
  const [phase2EvaluatedIds, setPhase2EvaluatedIds] = useState<Set<string>>(new Set());
  const [phase3EvaluatedIds, setPhase3EvaluatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch teams and evaluation status in parallel
        const [ 
          { data, error: subError }, 
          { data: evalsData }, 
          { data: p3EvalsData }, 
          { data: aiEvalsData, error: aiEvalsError },
          { data: aiEvals3Data }
        ] = await Promise.all([
          supabase
            .from("idealens_submissions2")
            .select("id, submitted_at, email, team_name, problem_statement_short, team_members")
            .order("submitted_at", { ascending: false }),
          supabase
            .from("human_evaluations")
            .select("idea_id"),
          supabase
            .from("human_evaluations_phase3")
            .select("idea_id"),
          supabase
            .from("ai_evaluations2")
            .select("team_name"),
          supabase
            .from("ai_evaluations3")
            .select("team_name")
        ]);

        if (subError) {
          console.error("Supabase Error fetching teams:", subError);
          throw subError;
        }

        const p2Evaluated = new Set((evalsData || []).map((e: any) => String(e.idea_id)));
        const p3Evaluated = new Set((p3EvalsData || []).map((e: any) => String(e.idea_id)));
        
        setPhase2EvaluatedIds(p2Evaluated);
        setPhase3EvaluatedIds(p3Evaluated);
        
        const phase3Names = (aiEvals3Data || aiEvalsData || [])
          .map((e: any) => e.team_name ? String(e.team_name).trim().toLowerCase() : "")
          .filter(Boolean);
        
        setPhase3TeamNames(phase3Names);

        setTeams(data as TeamPreview[]);
      } catch (err: any) {
        console.error("Dashboard Intelligence Error:", err);
        setError(`Failed to load intelligence: ${err.message || String(err)}`);
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
    const evaluated = 0; // Simplified
    const progress = 0;
    return { total, evaluated, progress };
  }, [teams]);

  const processedTeams = useMemo(() => {
    let result = teams;

    if (phase === "phase3") {
      result = result.filter((t) => {
        const teamName = (t.team_name || "").trim().toLowerCase();
        return phase3TeamNames.includes(teamName);
      });
      console.log("DEBUG: Final Phase 3 filtered count:", result.length);
    }

    result = result.filter((team) => {
      const q = query.toLowerCase();
      const matchName = (team.team_name || "").toLowerCase().includes(q);
      const matchMembers = (team.team_members || "").toLowerCase().includes(q);
      return matchName || matchMembers;
    });

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => (a.team_name || "").localeCompare(b.team_name || ""));
    } else {
      result = [...result]; // Keep default order (submitted_at desc)
    }

    return result;
  }, [teams, query, sortBy, phase]);

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-accent/30">

      {/* Logos Container */}
      <LogosHeader />

      <main className="w-full px-12 pt-1 pb-10">

        {/* SEARCH BAR & PHASE TOGGLE */}
        <div className="flex flex-col items-center justify-center mb-8 gap-5">
          <div className="relative w-full max-w-md group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team name"
              className="w-full bg-white rounded-2xl border border-slate-200 px-5 py-3 text-sm shadow-sm group-hover:shadow-md focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent/30 outline-none transition-all placeholder:text-slate-300 font-medium italic"
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-brand-accent transition-colors" />
          </div>

          <div className="flex items-center p-1 bg-slate-200/50 rounded-[14px] shadow-inner border border-slate-200/50">
            <button
              onClick={() => setPhase("phase2")}
              className={`px-6 py-2 rounded-[10px] text-[11px] font-black uppercase tracking-widest transition-all ${
                phase === "phase2"
                  ? "bg-white text-brand-accent shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              Phase 2 (All Teams)
            </button>
            <button
              onClick={() => setPhase("phase3")}
              className={`px-6 py-2 rounded-[10px] text-[11px] font-black uppercase tracking-widest transition-all ${
                phase === "phase3"
                  ? "bg-white text-brand-accent shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              Phase 3 (Top 21)
            </button>
          </div>
        </div>

        {/* PROGRESS & VIEW CONTROLS */}

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {processedTeams.map((team) => {
              const isEvaluated = phase === "phase3" 
                ? phase3EvaluatedIds.has(String(team.id))
                : phase2EvaluatedIds.has(String(team.id));

              return (
              <Link
                key={team.id}
                href={`/idea/team?id=${encodeURIComponent(team.id)}&phase=${phase}`}
                className="group bg-white rounded-[14px] border border-slate-100 p-2.5 shadow-sm hover:shadow-xl hover:scale-[1.03] transition-all flex flex-col items-center text-center gap-2 relative overflow-hidden h-40 w-full"
              >
                {phase !== "phase3" && (isEvaluated ? (
                    <div className="absolute bottom-3 right-3 flex items-center justify-center z-10" title="Evaluated">
                        <svg fill="currentColor" viewBox="0 0 100 100" className="w-[14px] h-[14px] text-green-500 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]">
                          <polygon points="35,85 10,60 20,50 35,65 80,15 90,25" />
                        </svg>
                    </div>
                ) : (
                    <div className="absolute bottom-3 right-3 flex items-center justify-center z-10" title="Not Evaluated">
                        <svg fill="currentColor" viewBox="0 0 100 100" className="w-[14px] h-[14px] text-rose-500 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]">
                          <polygon points="80,30 70,20 50,40 30,20 20,30 40,50 20,70 30,80 50,60 70,80 80,70 60,50" />
                        </svg>
                    </div>
                ))}
                
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-brand-accent/5 group-hover:bg-brand-accent transition-colors"></div>

                {/* Logo Section */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden relative shadow-md group-hover:rotate-3 transition-transform"
                  style={{
                    backgroundColor: [
                      '#FFD4B8', // Pastel Peach
                      '#B8E6D5', // Pastel Mint
                      '#F4C2D4', // Pastel Rose
                      '#B8D8E8', // Pastel Sky
                      '#E6D5F0', // Pastel Lavender
                      '#FFF4C4', // Pastel Cream
                      '#FFCCCB', // Pastel Coral
                      '#C4E5E7'  // Pastel Aqua
                    ][(team.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 8]
                  }}
                >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:10px_10px]"></div>
                  <span className="text-base font-black text-slate-700 uppercase italic">
                    {(team.team_name || "U").charAt(0)}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-0.5 w-full px-2 min-w-0 max-w-full flex-1">
                  <h3 className="text-[9px] font-black text-slate-900 uppercase italic group-hover:text-brand-accent transition-colors tracking-tight leading-snug line-clamp-2 text-center w-full">
                    {team.team_name || "Untitled"}
                  </h3>
                  {team.submitted_at && (
                    <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest italic opacity-40">
                      ID: {team.id.slice(0, 4)}
                    </span>
                  )}
                  {team.problem_statement_short && (
                    <p className="text-[8px] font-medium text-slate-600 truncate w-full max-w-full text-center mt-1">
                      {getSmartSummary(team.id, team.problem_statement_short)}
                    </p>
                  )}
                </div>

                <div className="w-full h-px bg-slate-50 mt-auto"></div>

                <div className="flex items-center justify-center gap-1.5 text-brand-accent font-black text-[7px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  DIVE <ChevronRight size={8} strokeWidth={4} />
                </div>
              </Link>
            )})}
          </div>
        )}

      </main>

    </div>
  );
}