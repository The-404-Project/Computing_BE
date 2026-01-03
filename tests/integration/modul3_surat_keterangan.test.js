
const request = require('supertest');
const app = require('../../src/app');
const service = require('../../src/modules/modul3_surat_keterangan/service');
const fs = require('fs');

jest.mock('../../src/modules/modul3_surat_keterangan/service');
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

describe('Integration: Modul 3 Surat Keterangan', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('POST /api/surat-keterangan/generate should generate file', async () => {
        service.findDokumenByNomor.mockResolvedValue(null);
        service.findMahasiswaByNim.mockResolvedValue({
            nim: '10115001',
            nama: 'Mahasiswa Test',
            prodi: 'Informatika',
            status: 'aktif',
            angkatan: 2015
        });

        // Mock fs for template reading
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('dummy-zip-content');

        const payload = {
            jenis_surat: 'surat keterangan aktif kuliah',
            nomor_surat: '003/SK/2025',
            nim: '10115001'
        };

        const res = await request(app)
            .post('/api/surat-keterangan/generate')
            .send(payload)
            .expect(200);

        expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(res.headers['content-disposition']).toMatch(/attachment; filename=surat_keterangan_/);
    });
});
