CREATE DATABASE IF NOT EXISTS DB_PersuratanFakultas;

USE DB_PersuratanFakultas;

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    role ENUM('admin', 'staff', 'kaprodi', 'dekan'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS templates (
    template_id INT PRIMARY KEY AUTO_INCREMENT,
    template_name VARCHAR(100),
    template_type VARCHAR(50),
    file_content LONGBLOB,
    variables JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS documents (
    doc_id INT PRIMARY KEY AUTO_INCREMENT,
    doc_number VARCHAR(50) UNIQUE,
    doc_type VARCHAR(50),
    template_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('draft', 'approved', 'sent'),
    file_path VARCHAR(255),
    metadata JSON,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (template_id) REFERENCES templates(template_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS mahasiswa (
    nim VARCHAR(20) PRIMARY KEY,
    nama VARCHAR(100),
    prodi VARCHAR(50),
    angkatan INT,
    status ENUM('aktif', 'cuti', 'lulus', 'keluar'),
    email VARCHAR(100)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS dokumen_surat (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nomor_registrasi VARCHAR(100) NOT NULL UNIQUE,
    nim VARCHAR(20) NOT NULL,
    jenis_surat VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dokumen_mahasiswa FOREIGN KEY (nim) REFERENCES mahasiswa(nim)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
