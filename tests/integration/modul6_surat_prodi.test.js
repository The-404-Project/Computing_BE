
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

describe('Integration: Modul 6 Surat Prodi', () => {
    it('POST /api/surat-prodi/generate should generate file', async () => {
        generateWordFile.mockReturnValue(Buffer.from('dummy-prodi'));

        const payload = {
            jenis_surat: 'surat_program_studi',
            nomor_surat: '006/PRODI/2025',
            content: { nama: 'Test' }
        };

        const res = await request(app)
            .post('/api/surat-prodi/generate')
            .send(payload)
            .expect(200);

        expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
});
