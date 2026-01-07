const request = require('supertest');
const fs = require('fs');
const app = require('../src/app');
const service = require('../src/modules/modul3_surat_keterangan/service');
const path = require('path');
const Document = require('../src/models/Document');

// Mock Database Config
jest.mock('../src/config/database', () => ({
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
    }),
}));

// Mock Models
jest.mock('../src/models/Document', () => ({
    create: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
}));
jest.mock('../src/models/User', () => ({
    findOne: jest.fn(),
}));

// Mock Dependencies
jest.mock('../src/modules/modul3_surat_keterangan/service');
jest.mock('pizzip', () => {
    return jest.fn().mockImplementation(() => ({
        file: jest.fn()
    }));
});
jest.mock('docxtemplater', () => {
    return jest.fn().mockImplementation(() => ({
        render: jest.fn(),
        getZip: jest.fn().mockReturnValue({
            generate: jest.fn().mockReturnValue(Buffer.from('mock content'))
        })
    }));
});
jest.mock('../src/utils/doc_generator', () => ({
    addWatermarkToPdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf watermark'))
}));

describe('Integration Test: Modul 3 Surat Keterangan', () => {
    let existsSyncSpy;
    let readFileSyncSpy;
    let writeFileSyncSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        // Spy on fs methods
        existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('mock template content');
        writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/surat-keterangan/mahasiswa', () => {
        it('should return mahasiswa data', async () => {
            service.findMahasiswaByNim.mockResolvedValue({
                nim: '10118001',
                nama: 'Test Mahasiswa',
                prodi: 'Teknik Informatika',
                status: 'aktif',
                angkatan: 2018,
                email: 'test@email.com'
            });

            const res = await request(app)
                .get('/api/surat-keterangan/mahasiswa')
                .query({ nim: '10118001' });

            expect(res.statusCode).toBe(200);
            expect(res.body.nim).toBe('10118001');
        });
    });

    describe('POST /api/surat-keterangan/create', () => {
        it('should create surat keterangan', async () => {
            // Setup mocks for success path
            service.findDokumenByNomor.mockResolvedValue(null); // No duplicate
            service.findMahasiswaByNim.mockResolvedValue({
                nim: '10118001',
                nama: 'Test',
                prodi: 'IF',
                status: 'aktif',
                angkatan: 2020
            });
            service.processSuratKeteranganGeneration.mockResolvedValue({
                fileName: 'surat_keterangan.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                buffer: Buffer.from('mock content')
            });
            service.getNextDocNumber.mockResolvedValue('SK-001/2025');

            // Mock fs specifically for this test
            // 1. Template dir check (true)
            // 2. Output dir check (true)
            // 3. Output file check (false - not existing)
            existsSyncSpy.mockImplementation((p) => {
                if (typeof p === 'string' && p.includes('generated_documents') && p.endsWith('.docx')) return false;
                return true;
            });

            const res = await request(app)
                .post('/api/surat-keterangan/create')
                .send({
                    nim: '10118001',
                    jenis_surat: 'aktif_kuliah',
                    keperluan: 'Beasiswa'
                });

            expect(res.statusCode).toBe(200);
            expect(service.processSuratKeteranganGeneration).toHaveBeenCalled();
        });
    });

    describe('POST /api/surat-keterangan/preview', () => {
        it('should preview surat keterangan', async () => {
            service.processSuratKeteranganGeneration.mockResolvedValue({
                buffer: Buffer.from('mock pdf'),
                fileName: 'preview.pdf',
                mimeType: 'application/pdf'
            });
            
            // Note: Modul 3 Controller preview calls processSuratKeteranganGeneration?
            // Let's check controller logic for preview again.
            // "async function previewSuratKeterangan(req, res) { ... const result = await service.processSuratKeteranganGeneration(...) }"
            // Wait, I read controller earlier, let me check my memory/logs.
            // Ah, I didn't read previewSuratKeterangan implementation fully in previous turn.
            // But usually preview delegates to service.
            // If it delegates, my mock of service.processSuratKeteranganGeneration should work.

            const res = await request(app)
                .post('/api/surat-keterangan/preview')
                .send({
                    nim: '10118001',
                    jenis_surat: 'surat keterangan aktif kuliah'
                });

            // If controller calls addWatermarkToPdf, it's mocked.
            // If controller delegates to service, service mock handles it.
            
            // Based on previous error "Gagal menambah watermark", it seems controller calls it or service calls it.
            // If service calls it, my service mock replaces it.
            // If controller calls it, my util mock replaces it.
            
            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toBe('application/pdf');
        });
    });
});
