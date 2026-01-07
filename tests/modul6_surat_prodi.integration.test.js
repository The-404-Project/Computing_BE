const request = require('supertest');
const app = require('../src/app');
const service = require('../src/modules/modul6_surat_prodi/service');
const Document = require('../src/models/Document');
const User = require('../src/models/User');

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
jest.mock('../src/models/Mahasiswa', () => ({}));
jest.mock('../src/models/Template', () => ({}));

// Mock Service
jest.mock('../src/modules/modul6_surat_prodi/service');

describe('Integration Test: Modul 6 Surat Prodi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/surat-prodi/mahasiswa', () => {
        it('should return mahasiswa', async () => {
            service.findMahasiswaByNim.mockResolvedValue({
                nim: '101',
                nama: 'Maha',
                prodi: 'IF',
                status: 'aktif'
            });

            const res = await request(app)
                .get('/api/surat-prodi/mahasiswa')
                .query({ nim: '101' });

            expect(res.statusCode).toBe(200);
            expect(res.body.nim).toBe('101');
        });
    });

    describe('POST /api/surat-prodi/create', () => {
        it('should create draft', async () => {
            service.processSuratProdiGeneration.mockResolvedValue({
                buffer: Buffer.from('mock content'),
                fileName: 'surat.docx',
                mimeType: 'application/docx',
                filePath: '/tmp/surat.docx'
            });

            service.findMahasiswaByNim.mockResolvedValue({
                nim: '101',
                nama: 'Maha',
                prodi: 'IF',
                status: 'aktif'
            });

            service.createApprovalWorkflow.mockResolvedValue(true);

            Document.count.mockResolvedValue(0);
            Document.create.mockResolvedValue({
                id: 1,
                doc_number: '001/PRODI/2025'
            });

            const res = await request(app)
                .post('/api/surat-prodi/create')
                .send({
                    nomorSurat: '001/PRODI/2025',
                    jenis_surat: 'surat prodi',
                    nim: '101'
                });

            console.log('Modul 6 Response:', res.status, res.body);

            expect(res.statusCode).toBe(200);
            expect(Document.create).toHaveBeenCalled();
        });
    });

    describe('POST /api/surat-prodi/generate', () => {
        it('should generate surat', async () => {
            service.processSuratProdiGeneration.mockResolvedValue({
                buffer: Buffer.from('mock content'),
                fileName: 'surat.docx',
                mimeType: 'application/docx',
                filePath: '/tmp/surat.docx'
            });

            const res = await request(app)
                .post('/api/surat-prodi/generate')
                .send({
                    nomorSurat: '001/PRODI/2025',
                    jenis_surat: 'surat prodi',
                    nim: '101'
                });

            expect(res.statusCode).toBe(200);
            expect(service.processSuratProdiGeneration).toHaveBeenCalled();
        });
    });
});
