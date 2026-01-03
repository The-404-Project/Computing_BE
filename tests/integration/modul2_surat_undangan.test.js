
const request = require('supertest');
const app = require('../../src/app');
const Document = require('../../src/models/Document');
const { generateWordFile } = require('../../src/utils/doc_generator');

jest.mock('../../src/models/Document');
jest.mock('../../src/utils/doc_generator');

describe('Integration: Modul 2 Surat Undangan', () => {
    it('POST /api/surat-undangan/create should generate file', async () => {
        Document.create.mockResolvedValue({ id: 1 });
        generateWordFile.mockReturnValue(Buffer.from('dummy-undangan'));

        const payload = {
            jenis_surat: 'undangan_rapat',
            nomorSurat: '002/UND/FI/2025',
            tanggalAcara: '2025-12-01',
            list_tamu: ['Pak Budi']
        };

        const res = await request(app)
            .post('/api/surat-undangan/create')
            .send(payload)
            .expect(200);

        expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
});
