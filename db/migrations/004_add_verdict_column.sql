-- Add verdict column to interviews table
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS verdict VARCHAR(20);

-- Add check constraint for valid verdict values
ALTER TABLE interviews ADD CONSTRAINT check_verdict 
CHECK (verdict IS NULL OR verdict IN ('Tiger', 'Cow', 'Sheep'));

-- Add index for verdict column
CREATE INDEX IF NOT EXISTS idx_interviews_verdict ON interviews (verdict);
