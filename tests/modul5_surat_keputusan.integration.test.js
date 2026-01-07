const request = require('supertest');
const app = require('../src/app');
const service = require('../src/modules/modul5_surat_keputusan/service');

// Mock Database Config
jest.mock('../src/config/database', () => ({
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
    }),
}));

// Mock Service
jest.mock('../src/modules/modul5_surat_keputusan/service');

describe('Integration Test: Modul 5 Surat Keputusan', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/surat-keputusan/templates', () => {
        it('should list templates', async () => {
            service.listTemplates.mockResolvedValue(['template1.docx', 'template2.docx']);

            const res = await request(app)
                .get('/api/surat-keputusan/templates');

            expect(res.statusCode).toBe(200);
            expect(res.body.templates).toHaveLength(2);
        });
    });

    describe('POST /api/surat-keputusan/generate-docx', () => {
        it('should generate docx', async () => {
            service.processSuratGeneration.mockResolvedValue({
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                buffer: Buffer.from('mock docx')
            });

            const res = await request(app)
                .post('/api/surat-keputusan/generate-docx')
                .send({
                    templateName: 'template1.docx',
                    data: { field: 'value' }
                });

            expect(res.statusCode).toBe(200);
            expect(service.processSuratGeneration).toHaveBeenCalled();
        });
    });

    describe('POST /api/surat-keputusan/preview', () => {
        it('should generate preview', async () => {
            service.processSuratGeneration.mockResolvedValue({
                mimeType: 'application/pdf',
                buffer: Buffer.from('mock pdf')
            });

            const res = await request(app)
                .post('/api/surat-keputusan/preview')
                .send({
                    templateName: 'template1.docx',
                    data: { field: 'value' }
                });

            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toBe('application/pdf');
        });
    });
});
