
const request = require('supertest');
const app = require('../../src/app');
const Document = require('../../src/models/Document');
const { generateWordFile } = require('../../src/utils/doc_generator');

jest.mock('../../src/models/Document');
jest.mock('../../src/utils/doc_generator');
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

describe('Integration: Modul 7 Surat Laak', () => {
    it('POST /api/surat-laak/create should generate file', async () => {
        Document.create.mockResolvedValue({ id: 1 });
        generateWordFile.mockReturnValue(Buffer.from('dummy-laak'));

        const payload = {
            jenis_surat: 'surat_laak',
            nomorSurat: '007/LAAK/2025',
            content: { detail: 'Test' }
        };

        const res = await request(app)
            .post('/api/surat-laak/create')
            .send(payload)
            .expect(200);

        expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
});
