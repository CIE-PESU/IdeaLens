"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import LogosHeader from "./components/LogosHeader";
import { Search, Check, ArrowRight, Plus, LayoutGrid, List, BarChart3, ChevronRight } from "lucide-react";

type TeamPreview = {
  id: string;
  team_name: string | null;
  email: string | null;
  submitted_at: string | null;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [allFetchedTeams, setAllFetchedTeams] = useState<TeamPreview[]>([]);
  const [intersectNames, setIntersectNames] = useState<string[]>([]);
  const [phaseMode, setPhaseMode] = useState<'phase2' | 'phase3'>('phase3');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact' | 'comparative'>('compact');
  const [filter, setFilter] = useState<'all' | 'evaluated' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'index'>('name');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch AI shortlisted team names (ai_evaluations2)
        const { data: aiData, error: aiError } = await supabase
          .from("ai_evaluations2")
          .select("team_name");

        if (aiError) {
          console.error("Error fetching AI shortlist:", aiError.message);
          throw aiError;
        }

        // 2. Fetch Human shortlisted team names (human_evaluations2)
        const { data: humanData, error: humanError } = await supabase
          .from("human_evaluations2")
          .select("team_name");

        if (humanError) {
          console.error("Error fetching human shortlist:", humanError.message);
          throw humanError;
        }

        // 3. Find intersection by team_name (Teams present in BOTH)
        // We use trimmed lowercase for the intersection logic
        const aiNames = (aiData || []).map(s => (s.team_name || "").trim()).filter(Boolean);
        const humanNames = (humanData || []).map(s => (s.team_name || "").trim().toLowerCase()).filter(Boolean);
        const intersectLower = aiNames.filter(n => humanNames.includes(n.toLowerCase())).map(n => n.toLowerCase());

        console.log("DEBUG LOGS:");
        console.log(" - ai_evaluations2 count:", aiData?.length || 0);
        console.log(" - human_evaluations2 count:", humanData?.length || 0);
        console.log(" - intersection count:", intersectLower.length);

        setIntersectNames(intersectLower);

        // 4. Fetch all submissions and filter in-memory to handle whitespace inconsistencies robustly
        const { data: allSubmissions, error: subError } = await supabase
          .from("idealens_submissions2")
          .select("id, submitted_at, email, team_name")
          .order("submitted_at", { ascending: false });

        if (subError) {
          console.error("Supabase Error fetching teams:", subError);
          throw subError;
        }

        setAllFetchedTeams(allSubmissions as TeamPreview[]);
      } catch (err: any) {
        console.error("Dashboard Intelligence Error:", err);
        setError(`Failed to load intelligence: ${err.message || String(err)}. Check if your Supabase project is active and reachable.`);
      } finally {
        setLoading(false);
      }
    };

    // Load viewMode and phaseMode from localStorage
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('ideaLensViewMode') as 'detailed' | 'compact';
      if (savedViewMode) setViewMode(savedViewMode);
      
      const savedPhaseMode = localStorage.getItem('ideaLensPhaseMode') as 'phase2' | 'phase3';
      if (savedPhaseMode) setPhaseMode(savedPhaseMode);
    }

    fetchData();
  }, []);

  // Persist settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ideaLensViewMode', viewMode);
      localStorage.setItem('ideaLensPhaseMode', phaseMode);
    }
  }, [viewMode, phaseMode]);



  const processedTeams = useMemo(() => {
    let baseTeams = allFetchedTeams;
    if (phaseMode === 'phase3') {
      baseTeams = allFetchedTeams.filter(sub => {
        const name = (sub.team_name || "").trim().toLowerCase();
        return intersectNames.includes(name);
      });
    }

    let result = baseTeams.filter((team) =>
      (team.team_name || "").toLowerCase().includes(query.toLowerCase())
    );

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => (a.team_name || "").localeCompare(b.team_name || ""));
    } else {
      result = [...result]; // Keep default order (submitted_at desc)
    }

    return result;
  }, [allFetchedTeams, intersectNames, phaseMode, query, sortBy]);

  const stats = useMemo(() => {
    const total = processedTeams?.length || 0;
    const evaluated = 0; // Simplified
    const progress = 0;
    return { total, evaluated, progress };
  }, [processedTeams]);

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-accent/30">

      {/* Logos Container */}
      <LogosHeader />

      <main className="w-full px-12 mt-0 pb-10">

        {/* SEARCH BAR & PHASE TOGGLE */}
        <div className="flex flex-col items-center mb-10 -mt-8 gap-6">
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
          
          {/* Toggle Control */}
          <div className="flex bg-slate-200/50 p-1 rounded-xl w-72 shadow-inner">
             <button 
               onClick={() => setPhaseMode('phase2')}
               className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] italic rounded-lg transition-all ${phaseMode === 'phase2' ? 'bg-white shadow pointer-events-none text-brand-accent' : 'text-slate-500 hover:text-slate-900'}`}
             >
               Phase 2 (All Teams)
             </button>
             <button 
               onClick={() => setPhaseMode('phase3')}
               className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] italic rounded-lg transition-all ${phaseMode === 'phase3' ? 'bg-white shadow pointer-events-none text-brand-accent' : 'text-slate-500 hover:text-slate-900'}`}
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
            {processedTeams.map((team) => (
              <Link
                key={team.id}
                href={`/idea/team?id=${encodeURIComponent(team.id)}`}
                className="group bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:scale-[1.03] transition-all flex flex-col items-center text-center gap-4 relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-accent/5 group-hover:bg-brand-accent transition-colors"></div>

                {/* Logo Section */}
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden relative shadow-lg group-hover:rotate-3 transition-transform">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:10px_10px]"></div>
                  <span className="text-2xl font-black text-white uppercase italic">
                    {(team.team_name || "U").charAt(0)}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <h3 className="text-[13px] font-black text-slate-900 uppercase italic group-hover:text-brand-accent transition-colors tracking-tight leading-snug">
                    {team.team_name || "Untitled"}
                  </h3>
                  {team.submitted_at && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-40">
                      ID: {team.id.slice(0, 4)}
                    </span>
                  )}
                </div>

                <div className="w-full h-px bg-slate-50"></div>
                
                <div className="flex items-center justify-center gap-2 text-brand-accent font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  DIVE <ChevronRight size={12} strokeWidth={4} />
                </div>
              </Link>
            ))}
          </div>
        )}

      </main>

    </div>
  );
}
