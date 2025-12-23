-- Supabase Schema for PhishGuard Migration
-- This schema mirrors the Blink database structure

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER DEFAULT 0,
  password_hash TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  phone_verified INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  metadata TEXT,
  is_active INTEGER DEFAULT 1,
  last_sign_in TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Phishing scans table
CREATE TABLE IF NOT EXISTS phishing_scans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  content TEXT NOT NULL,
  threat_level TEXT NOT NULL,
  confidence REAL NOT NULL,
  indicators TEXT NOT NULL,
  analysis TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  synced INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Training datasets table
CREATE TABLE IF NOT EXISTS training_datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  dataset_type TEXT NOT NULL,
  file_url TEXT,
  record_count INTEGER DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  is_active INTEGER DEFAULT 1,
  synced INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Training records table
CREATE TABLE IF NOT EXISTS training_records (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  content TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  is_phishing INTEGER NOT NULL DEFAULT 0,
  threat_level TEXT,
  indicators TEXT,
  notes TEXT,
  synced INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dataset_id) REFERENCES training_datasets(id)
);

-- Model versions table
CREATE TABLE IF NOT EXISTS model_versions (
  id TEXT PRIMARY KEY,
  version_number TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL,
  training_dataset_id TEXT,
  training_started_at TEXT,
  training_completed_at TEXT,
  training_duration INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  is_active INTEGER DEFAULT 0,
  metrics TEXT,
  config TEXT,
  created_by TEXT NOT NULL,
  synced INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (training_dataset_id) REFERENCES training_datasets(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Model tests table
CREATE TABLE IF NOT EXISTS model_tests (
  id TEXT PRIMARY KEY,
  model_version_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  test_dataset_id TEXT,
  test_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  results TEXT,
  metrics TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_by TEXT NOT NULL,
  synced INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (model_version_id) REFERENCES model_versions(id),
  FOREIGN KEY (test_dataset_id) REFERENCES training_datasets(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Sync events table
CREATE TABLE IF NOT EXISTS sync_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT,
  user_id TEXT,
  processed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  lookup_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  lookup_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Magic link tokens table
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  lookup_hash TEXT NOT NULL,
  redirect_url TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_phishing_scans_user_id ON phishing_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_phishing_scans_created_at ON phishing_scans(created_at);
CREATE INDEX IF NOT EXISTS idx_training_records_dataset_id ON training_records(dataset_id);
CREATE INDEX IF NOT EXISTS idx_model_tests_model_version_id ON model_tests(model_version_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_processed ON sync_events(processed);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (optional - can be configured later)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE phishing_scans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE training_datasets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE model_tests ENABLE ROW LEVEL SECURITY;
