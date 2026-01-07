const request = require('supertest');
const app = require('../../src/app');
const service = require('../../src/modules/modul4_surat_pengantar/service');
const Document = require('../../src/modules/modul4_surat_pengantar/model');

// Mock Database Config
jest.mock('../../src/config/database', () => ({
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
    }),
}));

// Mock Service and Model
jest.mock('../../src/modules/modul4_surat_pengantar/service');
jest.mock('../../src/modules/modul4_surat_pengantar/model', () => ({
    create: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
}));

describe('Integration Test: Modul 4 Surat Pengantar', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/surat-pengantar/create', () => {
        it('should create surat pengantar', async () => {
            service.processSuratGeneration.mockResolvedValue({
                buffer: Buffer.from('mock content'),
                fileName: 'surat_pengantar.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filePath: '/tmp/surat_pengantar.docx'
            });

            Document.count.mockResolvedValue(0);
            Document.create.mockResolvedValue({
                id: 1,
                doc_number: '001/SP/FI/01/2025'
            });

            const res = await request(app)
                .post('/api/surat-pengantar/create')
                .send({
                    nomorSurat: '001/SP/FI/01/2025',
                    jenis_surat: 'surat pengantar',
                    content_blocks: []
                });

            expect(res.statusCode).toBe(200);
            expect(service.processSuratGeneration).toHaveBeenCalled();
            expect(Document.create).toHaveBeenCalled();
        });
    });

    describe('POST /api/surat-pengantar/preview', () => {
        it('should preview surat pengantar', async () => {
            service.processSuratGeneration.mockResolvedValue({
                buffer: Buffer.from('mock pdf'),
                fileName: 'preview.pdf',
                mimeType: 'application/pdf'
            });

            const res = await request(app)
                .post('/api/surat-pengantar/preview')
                .send({
                    jenis_surat: 'surat pengantar'
                });

            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toBe('application/pdf');
            expect(service.processSuratGeneration).toHaveBeenCalledWith(
                expect.objectContaining({ jenis_surat: 'surat pengantar' }),
                'pdf',
                true
            );
        });
    });
});
