CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE check_status AS ENUM ('up', 'down');

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE monitors (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  url VARCHAR(255) NOT NULL,
  check_interval_seconds INTEGER NOT NULL,
  expected_status_code INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_url UNIQUE (user_id, url)
);

CREATE TABLE checks (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status check_status NOT NULL,
  response_time_ms INTEGER NULL,
  failure_reason VARCHAR(100) NULL,
  status_code_received INTEGER NULL,
  checked_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_checks_monitor_id_checked_at ON checks(monitor_id, checked_at);
CREATE INDEX idx_monitors_user_id ON monitors(user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON monitors
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ROLLBACK:
-- DROP TRIGGER set_updated_at ON monitors;
-- DROP TRIGGER set_updated_at ON users;
-- DROP FUNCTION update_updated_at;
-- DROP TABLE alerts;
-- DROP TABLE checks;
-- DROP TABLE monitors;
-- DROP TABLE users;
-- DROP TYPE check_status;
