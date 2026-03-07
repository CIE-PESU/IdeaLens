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
  const [teams, setTeams] = useState<TeamPreview[]>([]);
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
        // Fetch teams from idealens_submissions2
        const { data, error: subError } = await supabase
          .from("idealens_submissions2")
          .select("id, submitted_at, email, team_name")
          .order("submitted_at", { ascending: false });

        if (subError) {
          console.error("Supabase Error fetching teams:", subError);
          throw subError;
        }

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
    let result = teams.filter((team) =>
      (team.team_name || "").toLowerCase().includes(query.toLowerCase())
    );

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => (a.team_name || "").localeCompare(b.team_name || ""));
    } else {
      result = [...result]; // Keep default order (submitted_at desc)
    }

    return result;
  }, [teams, query, sortBy]);

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-accent/30">

      {/* Logos Container */}
      <LogosHeader />

      <main className="w-full px-12 mt-0 pb-10">

        {/* SEARCH BAR (OUTSIDE HEADER) */}
        <div className="flex justify-center mb-6">
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
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-100 pb-8">
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
                key={team.id}
                href={`/idea/team?id=${encodeURIComponent(team.id)}`}
                className="group flex items-center justify-between py-6 border-b border-slate-100 hover:bg-slate-50/50 transition-all px-4"
              >
                {/* Left Section: Logo & Name */}
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden relative group-hover:scale-105 transition-transform">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]"></div>
                    <span className="text-2xl font-black text-white/30 uppercase italic">
                      {(team.team_name || "U").charAt(0)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-slate-900 uppercase italic group-hover:text-brand-accent transition-colors tracking-tight">
                        {team.team_name || "Untitled"}
                      </h3>
                    </div>
                    {viewMode === 'detailed' && team.email && (
                      <p className="text-xs font-bold text-slate-400 italic max-w-lg truncate mt-1">
                        Contact: {team.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Section: Indicators & Actions */}
                <div className="flex items-center gap-10">
                  <div className="flex items-center gap-3 text-slate-300 group-hover:text-brand-accent transition-all">
                    <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </main>

    </div>
  );
}
