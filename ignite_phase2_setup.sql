-- ==========================================
-- IGNITE PHASE 2: DATABASE SETUP
-- ==========================================

-- 1. Create 'ai_evaluation2' (Master Shortlist & AI Refs)
-- This table identifies the 21 selected teams and their AI Phase 1 scores.
CREATE TABLE IF NOT EXISTS public.ai_evaluation2 (
    id SERIAL PRIMARY KEY,
    team_id UUID REFERENCES public.idealens_submissions2(id) ON DELETE CASCADE,
    team_name TEXT,
    desirability_score INTEGER,
    feasibility_score INTEGER,
    viability_score INTEGER,
    market_context_signal TEXT,
    execution_readiness_signal TEXT,
    evaluation_json JSONB,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_ai_shortlist UNIQUE(team_id)
);

-- 2. Create 'human_evaluation2' (Phase 1 Human Reference)
-- This table stores historical scores from the first evaluation round.
CREATE TABLE IF NOT EXISTS public.human_evaluation2 (
    id SERIAL PRIMARY KEY,
    idea_id UUID REFERENCES public.idealens_submissions2(id) ON DELETE CASCADE,
    team_name TEXT,
    desirability_score INTEGER,
    feasibility_score INTEGER,
    viability_score INTEGER,
    overall_comments TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_h1_ref UNIQUE(idea_id)
);

-- 3. Create 'human_evaluation_phase2' (Active Jury Scoring)
-- This is where the Ignite Phase 2 jury will save their live scores.
CREATE TABLE IF NOT EXISTS public.human_evaluation_phase2 (
    id SERIAL PRIMARY KEY,
    idea_id UUID REFERENCES public.idealens_submissions2(id) ON DELETE CASCADE,
    team_name TEXT,
    desirability_score INTEGER,
    feasibility_score INTEGER,
    viability_score INTEGER,
    overall_comments TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_phase2_idea UNIQUE(idea_id)
);

-- ==========================================
-- RLS POLICIES (Public Accessibility)
-- ==========================================

-- Enable RLS on all Phase 2 tables
ALTER TABLE public.ai_evaluation2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_evaluation2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_evaluation_phase2 ENABLE ROW LEVEL SECURITY;

-- Allow Public READ for all Phase 2 tables
CREATE POLICY "Allow public read on ai_evaluation2" ON public.ai_evaluation2 FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read on human_evaluation2" ON public.human_evaluation2 FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read on human_evaluation_phase2" ON public.human_evaluation_phase2 FOR SELECT TO anon USING (true);

-- Allow Public UPSERT for the Active Jury Table
CREATE POLICY "Allow public upsert on human_evaluation_phase2" 
ON public.human_evaluation_phase2 FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==========================================
-- INSTRUCTIONS
-- ==========================================
-- 1. Copy this entire script.
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Paste and RUN.
-- 4. Refresh your browser page to clear the "Could not find table" error.
