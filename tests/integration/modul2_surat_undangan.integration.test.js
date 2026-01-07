const request = require('supertest');
const app = require('../../src/app');
const service = require('../../src/modules/modul2_surat_undangan/service');
const Document = require('../../src/modules/modul2_surat_undangan/model'); // Note: Modul 2 uses local model import in controller

// Mock Database Config
jest.mock('../../src/config/database', () => ({
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
    }),
}));

// Mock Service and Model
jest.mock('../../src/modules/modul2_surat_undangan/service');
jest.mock('../../src/modules/modul2_surat_undangan/model', () => ({
    create: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
}));

describe('Integration Test: Modul 2 Surat Undangan', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/surat-undangan/create', () => {
        it('should generate surat undangan successfully', async () => {
            // Mock Service Response
            service.processSuratUndangan.mockResolvedValue({
                buffer: Buffer.from('mock docx content'),
                fileName: 'surat_undangan_mock.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filePath: '/tmp/surat_undangan_mock.docx'
            });

            // Mock Document.create
            Document.create.mockResolvedValue({
                id: 1,
                doc_number: '001/UND/FI/01/2025'
            });

            // Mock Document.count for auto-number
            Document.count.mockResolvedValue(0);

            const res = await request(app)
                .post('/api/surat-undangan/create')
                .send({
                    nomorSurat: '001/UND/FI/01/2025',
                    perihal: 'Rapat',
                    kepada: 'Dosen',
                    tanggalAcara: '2025-01-10',
                    lokasi: 'Ruang Sidang',
                    list_tamu: []
                });

            expect(res.statusCode).toBe(200);
            expect(service.processSuratUndangan).toHaveBeenCalled();
            expect(Document.create).toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            service.processSuratUndangan.mockRejectedValue(new Error('Generation Failed'));

            const res = await request(app)
                .post('/api/surat-undangan/create')
                .send({});

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toBe('Gagal membuat undangan');
        });
    });

    describe('POST /api/surat-undangan/preview', () => {
        it('should generate preview successfully', async () => {
            service.processSuratUndangan.mockResolvedValue({
                buffer: Buffer.from('mock pdf preview'),
                fileName: 'preview.pdf',
                mimeType: 'application/pdf'
            });

            const res = await request(app)
                .post('/api/surat-undangan/preview')
                .send({
                    perihal: 'Rapat Preview'
                });

            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toBe('application/pdf');
            expect(service.processSuratUndangan).toHaveBeenCalledWith(
                expect.objectContaining({ nomorSurat: expect.stringContaining('PREVIEW') }),
                'pdf',
                true
            );
        });
    });
});
