-- Active: 1748100798735@@127.0.0.1@3306@db_persuratanfakultas
-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Dec 17, 2025 at 04:57 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_persuratanfakultas`
--

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `doc_number` varchar(255) NOT NULL,
  `doc_type` varchar(255) NOT NULL DEFAULT 'general',
  `status` varchar(255) DEFAULT 'draft',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `file_path` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `doc_number`, `doc_type`, `status`, `metadata`, `file_path`, `created_by`, `created_at`, `updated_at`) VALUES
(1, '001/UND/FI/12/2025', 'surat_undangan', 'draft', '{\"perihal\":\"Undangan\",\"kepada\":\"dsfdsf, 23123\",\"tanggal_acara\":\"2025-12-25\",\"tempat\":\"dfdsfdf\",\"generated_file\":\"Undangan_Undangan_1765986938268.docx\"}', NULL, 1, '2025-12-17 15:55:38', '2025-12-17 15:55:38'),
(2, '002/UND/FI/12/2025', 'surat_undangan', 'draft', '{\"perihal\":\"Undangan\",\"kepada\":\"dsfdsf, 23123\",\"tanggal_acara\":\"2025-12-25\",\"tempat\":\"dfdsfdf\",\"generated_file\":\"Undangan_Undangan_1765986956884.pdf\"}', NULL, 1, '2025-12-17 15:55:56', '2025-12-17 15:55:56');

-- --------------------------------------------------------

--
-- Table structure for table `mahasiswa`
--

CREATE TABLE `mahasiswa` (
  `nim` varchar(20) NOT NULL,
  `nama` varchar(100) DEFAULT NULL,
  `prodi` varchar(50) DEFAULT NULL,
  `angkatan` int(11) DEFAULT NULL,
  `status` enum('aktif','cuti','lulus','keluar') DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mahasiswa`
--

INSERT INTO `mahasiswa` (`nim`, `nama`, `prodi`, `angkatan`, `status`, `email`) VALUES
('1234567890', 'Budi Setiawan', 'Teknik Informatika', 2023, 'aktif', 'budi.setiawan@example.com'),
('1357924680', 'Siti Rahma', 'Sistem Informasi', 2022, 'aktif', 'siti.rahma@example.com'),
('2468135790', 'Andi Pratama', 'Teknik Informatika', 2020, 'lulus', 'andi.pratama@example.com');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `role` enum('admin','staff','kaprodi','dekan') DEFAULT 'staff',
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password_hash`, `role`, `full_name`, `email`, `created_at`) VALUES
(1, 'admin', '$2b$10$bTvCsCgfgNhEzpnQP88BiuXmC5hE/224HDQv6beeg3h.vAbxCGptW', 'admin', 'Administrator Utama', 'admin@fakultas.ac.id', '2025-12-17 15:55:08');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `mahasiswa`
--
ALTER TABLE `mahasiswa`
  ADD PRIMARY KEY (`nim`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `username_2` (`username`),
  ADD UNIQUE KEY `username_3` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
