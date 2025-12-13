CREATE DATABASE IF NOT EXISTS DB_PersuratanFakultas;

USE DB_PersuratanFakultas;

CREATE TABLE IF NOT EXISTS mahasiswa (
    nim VARCHAR(20) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    prodi VARCHAR(50) NOT NULL,
    angkatan INT NOT NULL,
    status ENUM(
        'aktif',
        'cuti',
        'lulus',
        'keluar'
    ) NOT NULL,
    email VARCHAR(100)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;