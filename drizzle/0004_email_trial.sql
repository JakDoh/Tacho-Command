CREATE TABLE beta_accounts (id TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL, trial_started_at INTEGER);
CREATE TABLE beta_login_tokens (token_hash TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL REFERENCES beta_accounts(id), expires_at INTEGER NOT NULL);
CREATE INDEX beta_login_expiry_idx ON beta_login_tokens(expires_at);
CREATE TABLE beta_sessions (token_hash TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL REFERENCES beta_accounts(id), expires_at INTEGER NOT NULL);
CREATE INDEX beta_session_expiry_idx ON beta_sessions(expires_at);
CREATE TABLE beta_request_limits (id TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
