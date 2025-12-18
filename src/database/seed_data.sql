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
INSERT INTO templates (template_name, template_type, file_path, variables, description, is_active) 
VALUES 
  ('template_surat_tugas.docx', 'surat_tugas', 'src/templates/surat_templates/template_surat_tugas.docx', 
   '["nomor_surat", "tanggal", "nama", "nip", "jabatan", "tujuan", "keperluan", "tanggal_mulai", "tanggal_selesai", "lama_hari", "biaya"]', 
   'Template untuk Surat Tugas Dosen/Staf', TRUE),
  
  ('template_sppd.docx', 'sppd', 'src/templates/surat_templates/template_sppd.docx',
   '["nomor_surat", "tanggal", "nama", "nip", "pangkat", "jabatan", "tujuan", "keperluan", "tanggal_mulai", "tanggal_selesai", "lama_hari", "biaya", "kendaraan"]',
   'Template untuk Surat Perintah Perjalanan Dinas', TRUE),
  
  ('template_undangan.docx', 'surat_undangan', 'src/templates/surat_templates/template_undangan.docx',
   '["nomor_surat", "lampiran", "perihal", "kepada", "hari", "tanggal", "waktu", "tempat", "agenda", "tanggal_surat"]',
   'Template untuk Surat Undangan', TRUE),
  
  ('template_pengantarpermohonan_A.docx', 'surat_pengantar', 'src/templates/surat_templates/template_pengantarpermohonan_A.docx',
   '["metadata", "content_blocks", "dynamic_data", "today"]',
   'Template A untuk Surat Pengantar Permohonan', TRUE),
  
  ('template_pengantarpermohonan_B.docx', 'surat_pengantar', 'src/templates/surat_templates/template_pengantarpermohonan_B.docx',
   '["metadata", "content_blocks", "dynamic_data", "today"]',
   'Template B untuk Surat Pengantar dengan Tabel Data', TRUE)
ON DUPLICATE KEY UPDATE template_name=template_name;