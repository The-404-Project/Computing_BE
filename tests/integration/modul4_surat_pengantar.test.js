
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

describe('Integration: Modul 4 Surat Pengantar', () => {
    it('POST /api/surat-pengantar/create should generate file', async () => {
        Document.create.mockResolvedValue({ id: 1 });
        generateWordFile.mockReturnValue(Buffer.from('dummy-pengantar'));

        const payload = {
            jenis_surat: 'pengantar_umum',
            nomorSurat: '004/SP/2025',
            metadata: { perihal: 'Test' }
        };

        const res = await request(app)
            .post('/api/surat-pengantar/create')
            .send(payload)
            .expect(200);

        expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
});
