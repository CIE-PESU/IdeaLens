-- 1. Create 'human_evaluation_phase2' table for Ignite Phase 2 scores
CREATE TABLE IF NOT EXISTS human_evaluation_phase2 (
    id SERIAL PRIMARY KEY,
    idea_id UUID REFERENCES idealens_submissions2(id) ON DELETE CASCADE,
    team_name TEXT,
    desirability_score INTEGER,
    feasibility_score INTEGER,
    viability_score INTEGER,
    overall_comments TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_phase2_idea UNIQUE(idea_id)
);

-- 2. Enable RLS
ALTER TABLE human_evaluation_phase2 ENABLE ROW LEVEL SECURITY;

-- 3. Add Public READ policy
CREATE POLICY "Allow public read on human_evaluation_phase2" 
ON human_evaluation_phase2 FOR SELECT TO anon USING (true);

-- 4. Add Public INSERT/UPSERT policy
CREATE POLICY "Allow public upsert on human_evaluation_phase2" 
ON human_evaluation_phase2 FOR ALL TO anon USING (true) WITH CHECK (true);
