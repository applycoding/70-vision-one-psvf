CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  procedure_id TEXT NOT NULL,
  status TEXT NOT NULL,
  timing_label TEXT NOT NULL,
  stills_source TEXT,
  whisper_score REAL,
  whisper_threshold REAL NOT NULL DEFAULT 0.95,
  script_text TEXT,
  error TEXT,
  mp4_key TEXT,
  audio_duration_ms INTEGER,
  source_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_timings (
  job_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (job_id, stage)
);

CREATE TABLE IF NOT EXISTS lineage (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  procedure_id TEXT NOT NULL,
  step_label TEXT NOT NULL,
  script_line TEXT NOT NULL,
  scene_index INTEGER NOT NULL,
  figure TEXT NOT NULL,
  page_ref TEXT NOT NULL,
  asset_key TEXT,
  t_start_ms INTEGER NOT NULL,
  t_end_ms INTEGER NOT NULL
);
