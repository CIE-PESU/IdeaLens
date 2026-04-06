-- ==========================================
-- IGNITE PHASE 2: DATA VISIBILITY FIX
-- ==========================================

-- 1. Ensure RLS is enabled on all correct tables
ALTER TABLE public.ai_evaluations2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_evaluations2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_evaluations_phase2 ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old/incorrect policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read on ai_evaluations2" ON public.ai_evaluations2;
DROP POLICY IF EXISTS "Allow public read on human_evaluations2" ON public.human_evaluations2;
DROP POLICY IF EXISTS "Allow public read on human_evaluations_phase2" ON public.human_evaluations_phase2;

-- 3. Create CLEAN public read policies for the 'anon' role
CREATE POLICY "Allow public read on ai_evaluations2" 
ON public.ai_evaluations2 FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public read on human_evaluations2" 
ON public.human_evaluations2 FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public read on human_evaluations_phase2" 
ON public.human_evaluations_phase2 FOR SELECT TO anon USING (true);

-- 4. Create CLEAN public UPSERT policy for live jury scoring
DROP POLICY IF EXISTS "Allow public upsert on human_evaluations_phase2" ON public.human_evaluations_phase2;

CREATE POLICY "Allow public upsert on human_evaluations_phase2" 
ON public.human_evaluations_phase2 FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==========================================
-- INSTRUCTIONS
-- ==========================================
-- 1. Copy this entire script.
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Paste and RUN.
-- 4. Refresh your browser page to restore the 21-team dashboard view.
