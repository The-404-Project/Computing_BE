-- ============================================
-- SEED DATA - SIPENA System
-- ============================================

USE db_persuratanfakultas;

-- ============================================
-- SEED: users (Admin default)
-- ============================================
-- Password: admin123 (hashed dengan bcrypt)
INSERT INTO users (username, password_hash, role, full_name, email, created_at) 
VALUES 
  ('admin', '$2b$10$bTvCsCgfgNhEzpnQP88BiuXmC5hE/224HDQv6beeg3h.vAbxCGptW', 'admin', 'Administrator Utama', 'admin@fakultas.ac.id', NOW())
ON DUPLICATE KEY UPDATE username=username;

-- ============================================
-- SEED: mahasiswa (Sample data)
-- ============================================
INSERT INTO mahasiswa (nim, nama, prodi, angkatan, status, email) 
VALUES 
  ('1234567890', 'Budi Setiawan', 'Teknik Informatika', 2023, 'aktif', 'budi.setiawan@example.com'),
  ('1357924680', 'Siti Rahma', 'Sistem Informasi', 2022, 'aktif', 'siti.rahma@example.com'),
  ('2468135790', 'Andi Pratama', 'Teknik Informatika', 2020, 'lulus', 'andi.pratama@example.com')
ON DUPLICATE KEY UPDATE nim=nim;

-- ============================================
-- SEED: templates (Template yang sudah ada)
-- ============================================
