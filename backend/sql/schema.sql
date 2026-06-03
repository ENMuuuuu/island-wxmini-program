CREATE DATABASE IF NOT EXISTS habit_app
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE habit_app;

CREATE TABLE IF NOT EXISTS app_user (
  id INT NOT NULL AUTO_INCREMENT,
  nickname VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(1024) NULL,
  bio VARCHAR(200) NULL,
  birthday DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS media_asset (
  id INT NOT NULL AUTO_INCREMENT,
  storage_type VARCHAR(16) NOT NULL DEFAULT 'oss',
  bucket VARCHAR(128) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  file_url VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  width INT NULL,
  height INT NULL,
  size_bytes INT NULL,
  file_hash VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_media_asset_file_hash (file_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS growth_theme (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  theme_type VARCHAR(32) NOT NULL,
  total_layers INT NOT NULL DEFAULT 0,
  preview_url VARCHAR(1024) NOT NULL,
  config_json JSON NULL,
  theme_status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habit (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  description VARCHAR(255) NULL,
  frequency_type VARCHAR(16) NOT NULL DEFAULT 'daily',
  goal_times_per_day INT NOT NULL DEFAULT 1,
  theme_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  habit_status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_habit_user_id (user_id),
  KEY idx_habit_theme_id (theme_id),
  CONSTRAINT fk_habit_user FOREIGN KEY (user_id) REFERENCES app_user(id),
  CONSTRAINT fk_habit_theme FOREIGN KEY (theme_id) REFERENCES growth_theme(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habit_schedule (
  id INT NOT NULL AUTO_INCREMENT,
  habit_id INT NOT NULL,
  repeat_type VARCHAR(16) NOT NULL DEFAULT 'daily',
  weekdays_json JSON NULL,
  remind_time TIME NULL,
  deadline_time TIME NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_habit_schedule_habit_id (habit_id),
  CONSTRAINT fk_habit_schedule_habit FOREIGN KEY (habit_id) REFERENCES habit(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habit_day_record (
  id INT NOT NULL AUTO_INCREMENT,
  habit_id INT NOT NULL,
  record_date DATE NOT NULL,
  record_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  should_checkin TINYINT(1) NOT NULL DEFAULT 1,
  checkin_count INT NOT NULL DEFAULT 0,
  is_late TINYINT(1) NOT NULL DEFAULT 0,
  pause_reason VARCHAR(255) NULL,
  dark_level INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_habit_day_record_habit_id (habit_id),
  KEY idx_habit_day_record_record_date (record_date),
  CONSTRAINT fk_habit_day_record_habit FOREIGN KEY (habit_id) REFERENCES habit(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habit_checkin (
  id INT NOT NULL AUTO_INCREMENT,
  habit_id INT NOT NULL,
  day_record_id INT NOT NULL,
  user_id INT NOT NULL,
  checkin_at DATETIME NOT NULL,
  note TEXT NULL,
  proof_media_id INT NULL,
  checkin_source VARCHAR(16) NOT NULL DEFAULT 'manual',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_habit_checkin_habit_id (habit_id),
  KEY idx_habit_checkin_day_record_id (day_record_id),
  KEY idx_habit_checkin_user_id (user_id),
  KEY idx_habit_checkin_checkin_at (checkin_at),
  CONSTRAINT fk_habit_checkin_habit FOREIGN KEY (habit_id) REFERENCES habit(id),
  CONSTRAINT fk_habit_checkin_day_record FOREIGN KEY (day_record_id) REFERENCES habit_day_record(id),
  CONSTRAINT fk_habit_checkin_user FOREIGN KEY (user_id) REFERENCES app_user(id),
  CONSTRAINT fk_habit_checkin_media FOREIGN KEY (proof_media_id) REFERENCES media_asset(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habit_growth_layer (
  id INT NOT NULL AUTO_INCREMENT,
  habit_id INT NOT NULL,
  checkin_id INT NOT NULL,
  layer_no INT NOT NULL,
  image_url VARCHAR(1024) NOT NULL,
  render_state VARCHAR(16) NOT NULL DEFAULT 'normal',
  pos_x DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  pos_y DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  z_index INT NOT NULL DEFAULT 0,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_habit_growth_layer_checkin_id (checkin_id),
  KEY idx_habit_growth_layer_habit_id (habit_id),
  CONSTRAINT fk_habit_growth_layer_habit FOREIGN KEY (habit_id) REFERENCES habit(id),
  CONSTRAINT fk_habit_growth_layer_checkin FOREIGN KEY (checkin_id) REFERENCES habit_checkin(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS habit_growth_state (
  habit_id INT NOT NULL,
  current_layer_count INT NOT NULL DEFAULT 0,
  lit_layer_count INT NOT NULL DEFAULT 0,
  dark_layer_count INT NOT NULL DEFAULT 0,
  progress_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  growth_status VARCHAR(16) NOT NULL DEFAULT 'growing',
  current_preview_url VARCHAR(1024) NULL,
  last_grow_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (habit_id),
  CONSTRAINT fk_habit_growth_state_habit FOREIGN KEY (habit_id) REFERENCES habit(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
