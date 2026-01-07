const request = require('supertest');
const app = require('../src/app');
const service = require('../src/modules/modul1_surat_tugas/service');
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
    update: jest.fn(),
}));
jest.mock('../src/models/User', () => ({}));
jest.mock('../src/models/Mahasiswa', () => ({}));
jest.mock('../src/models/Template', () => ({}));

// Mock Service
jest.mock('../src/modules/modul1_surat_tugas/service');

describe('Integration Test: Modul 1 Surat Tugas', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/surat-tugas/create', () => {
        it('should generate surat tugas successfully', async () => {
            // Mock Service Response
            service.processSuratTugasGeneration.mockResolvedValue({
                buffer: Buffer.from('mock pdf content'),
                fileName: 'surat_tugas_mock.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filePath: '/tmp/surat_tugas_mock.docx'
            });

            // Mock Document.create
            Document.create.mockResolvedValue({
                id: 1,
                doc_number: '001/ST/FI/01/2025'
            });

            // Mock Document.count for auto-number
            Document.count.mockResolvedValue(0);

            const res = await request(app)
                .post('/api/surat-tugas/create')
                .send({
                    nomorSurat: '001/ST/FI/01/2025',
                    namaPegawai: 'John Doe',
                    nip: '123456789',
                    tujuanTugas: 'Jakarta',
                    keperluan: 'Dinas Luar',
                    tanggalMulai: '2025-01-01',
                    tanggalSelesai: '2025-01-03'
                });

            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            expect(service.processSuratTugasGeneration).toHaveBeenCalled();
            expect(Document.create).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            service.processSuratTugasGeneration.mockRejectedValue(new Error('Service Error'));

            const res = await request(app)
                .post('/api/surat-tugas/create')
                .send({});

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toContain('Gagal membuat Surat Tugas');
        });
    });

    describe('POST /api/surat-tugas/preview', () => {
        it('should generate preview successfully', async () => {
            service.processSuratTugasGeneration.mockResolvedValue({
                buffer: Buffer.from('mock pdf preview'),
                fileName: 'preview.pdf',
                mimeType: 'application/pdf'
            });

            const res = await request(app)
                .post('/api/surat-tugas/preview')
                .send({
                    namaPegawai: 'John Doe'
                });

            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toBe('application/pdf');
            expect(service.processSuratTugasGeneration).toHaveBeenCalledWith(
                expect.objectContaining({ nomorSurat: expect.stringContaining('PREVIEW') }),
                'pdf',
                true
            );
        });
    });
});
