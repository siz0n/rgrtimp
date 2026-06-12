REATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_code VARCHAR(10),
  email_verification_expires TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  email_verification_code VARCHAR(10) NOT NULL,
  email_verification_expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS request_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type_id INTEGER NOT NULL REFERENCES request_types(id),
  status_id INTEGER NOT NULL REFERENCES request_statuses(id),
  assigned_employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  response_text TEXT,
  deadline_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_username VARCHAR(60),
  actor_email VARCHAR(120),
  actor_role VARCHAR(30),
  action VARCHAR(100) NOT NULL,
  entity_name VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  ip_address VARCHAR(64),
  user_agent TEXT,
  http_method VARCHAR(10),
  request_path TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_expires ON pending_users(email_verification_expires);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_request_type_id ON requests(request_type_id);
CREATE INDEX IF NOT EXISTS idx_requests_status_id ON requests(status_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_employee_id ON requests(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_comments_request_id ON comments(request_id);
CREATE INDEX IF NOT EXISTS idx_comments_employee_id ON comments(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_name ON audit_logs(entity_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON audit_logs(actor_role);

INSERT INTO roles (name)
VALUES ('USER'), ('EMPLOYEE'), ('ADMIN')
ON CONFLICT (name) DO NOTHING;

INSERT INTO request_types (name)
VALUES
  ('Просмотр персональных данных'),
  ('Исправление персональных данных'),
  ('Удаление персональных данных'),
  ('Отзыв согласия на обработку')
ON CONFLICT (name) DO NOTHING;

INSERT INTO request_statuses (name)
VALUES
  ('Новое'),
  ('В обработке'),
  ('Выполнено'),
  ('Отклонено'),
  ('Просрочено')
ON CONFLICT (name) DO NOTHING;
