CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  client_name VARCHAR(150) NOT NULL,
  budget_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  status ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('requested', 'approved', 'rejected') NOT NULL DEFAULT 'requested',
  approver_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id)
);

CREATE TABLE timesheets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  work_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('draft', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',
  approver_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (approver_id) REFERENCES users(id)
);

CREATE TABLE approval_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  timesheet_id INT NOT NULL,
  actor_id INT NOT NULL,
  action ENUM('submitted', 'approved', 'rejected') NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (timesheet_id) REFERENCES timesheets(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

INSERT INTO roles (name) VALUES ('member'), ('manager'), ('admin');
INSERT INTO projects (name, client_name, budget_hours, status) VALUES
  ('勤怠連携自動化', '株式会社サンプル', 120, 'active'),
  ('RPA 運用改善', '社内業務部', 80, 'active'),
  ('データ移行支援', '株式会社テスト', 60, 'paused');
