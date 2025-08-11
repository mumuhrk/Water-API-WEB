-- Add digit_details JSONB and task_id to meter_readings for storing per-digit info and mapping to async tasks
ALTER TABLE meter_readings
ADD COLUMN IF NOT EXISTS digit_details JSONB NULL,
ADD COLUMN IF NOT EXISTS task_id TEXT NULL;

-- Optional index to look up by task quickly
CREATE INDEX IF NOT EXISTS idx_meter_readings_task_id ON meter_readings(task_id);
