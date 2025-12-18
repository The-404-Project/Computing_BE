-- ============================================
-- DATABASE SCHEMA - SIPENA System
-- ============================================

CREATE DATABASE IF NOT EXISTS db_persuratanfakultas;
USE db_persuratanfakultas;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  user_id INT(11) NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'kaprodi', 'dekan') DEFAULT 'staff',
  full_name VARCHAR(100),
  email VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: documents
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id INT(11) NOT NULL AUTO_INCREMENT,
  doc_number VARCHAR(255) NOT NULL,
  doc_type VARCHAR(255) NOT NULL DEFAULT 'general',
  status VARCHAR(255) DEFAULT 'draft',
  metadata LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(metadata)),
  file_path VARCHAR(255) DEFAULT NULL,
  created_by INT(11) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY created_by (created_by),
  CONSTRAINT documents_ibfk_1 FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: mahasiswa
-- ============================================
CREATE TABLE IF NOT EXISTS mahasiswa (
  nim VARCHAR(20) NOT NULL,
  nama VARCHAR(100),
  prodi VARCHAR(50),
  angkatan INT(11),
  status ENUM('aktif', 'cuti', 'lulus', 'keluar'),
  email VARCHAR(100),
  PRIMARY KEY (nim)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: templates (Sesuai SRS)
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  template_id INT(11) NOT NULL AUTO_INCREMENT,
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  variables JSON DEFAULT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (template_id),
  KEY template_type (template_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;