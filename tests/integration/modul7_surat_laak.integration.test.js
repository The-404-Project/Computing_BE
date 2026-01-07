const request = require('supertest');
const app = require('../../src/app');
const service = require('../../src/modules/modul7_surat_laak/service');
const Document = require('../../src/modules/modul7_surat_laak/model');

// Mock Database Config
jest.mock('../../src/config/database', () => ({
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
    }),
}));

// Mock Service and Model
jest.mock('../../src/modules/modul7_surat_laak/service');
jest.mock('../../src/modules/modul7_surat_laak/model', () => ({
    create: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
}));

describe('Integration Test: Modul 7 Surat LAAK', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/surat-laak/create', () => {
        it('should create surat LAAK', async () => {
            service.processSuratLAAK.mockResolvedValue({
                buffer: Buffer.from('mock content'),
                fileName: 'surat_laak.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filePath: '/tmp/surat_laak.docx'
            });

            Document.count.mockResolvedValue(0);
            Document.create.mockResolvedValue({
                id: 1,
                doc_number: '001/UNIV/LAAK/01/2025'
            });

            const res = await request(app)
                .post('/api/surat-laak/create')
                .send({
                    nomorSurat: '001/UNIV/LAAK/01/2025',
                    jenis_surat: 'surat laak',
                    unit: 'Prodi'
                });

            expect(res.statusCode).toBe(200);
            expect(service.processSuratLAAK).toHaveBeenCalled();
            expect(Document.create).toHaveBeenCalled();
        });
    });

    describe('POST /api/surat-laak/preview', () => {
        it('should preview surat LAAK', async () => {
            service.processSuratLAAK.mockResolvedValue({
                buffer: Buffer.from('mock pdf'),
                fileName: 'preview.pdf',
                mimeType: 'application/pdf'
            });

            const res = await request(app)
                .post('/api/surat-laak/preview')
                .send({
                    unit: 'Prodi'
                });

            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toBe('application/pdf');
        });
    });
});
