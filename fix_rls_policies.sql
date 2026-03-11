-- Enable RLS and add public READ policies for all required tables in the new database

-- 1. Enable RLS (just in case they were enabled but had no policies)
ALTER TABLE idealens_submissions2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;

-- 2. Add policies for Public Read (Allow EVERYONE to view data)
DROP POLICY IF EXISTS "Allow public read on idealens_submissions2" ON idealens_submissions2;
CREATE POLICY "Allow public read on idealens_submissions2" ON idealens_submissions2
FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public read on ai_evaluations" ON ai_evaluations;
CREATE POLICY "Allow public read on ai_evaluations" ON ai_evaluations
FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public read on human_evaluations" ON human_evaluations;
CREATE POLICY "Allow public read on human_evaluations" ON human_evaluations
FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public read on teams" ON teams;
CREATE POLICY "Allow public read on teams" ON teams
FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public read on evaluation_runs" ON evaluation_runs;
CREATE POLICY "Allow public read on evaluation_runs" ON evaluation_runs
FOR SELECT TO anon USING (true);

-- 3. Add policy for Public Insert on human_evaluations (Allow jury to submit scores)
DROP POLICY IF EXISTS "Allow public insert on human_evaluations" ON human_evaluations;
CREATE POLICY "Allow public insert on human_evaluations" ON human_evaluations
FOR INSERT TO anon WITH CHECK (true);
