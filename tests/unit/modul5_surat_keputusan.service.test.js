
const service = require('../../src/modules/modul5_surat_keputusan/service');
const { generateWordFile } = require('../../src/utils/doc_generator');

jest.mock('../../src/utils/doc_generator');
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn().mockReturnValue(['template1.docx']),
    unlinkSync: jest.fn(),
}));

describe('Modul 5: Surat Keputusan Service', () => {
    it('should process generation successfully', async () => {
        generateWordFile.mockReturnValue(Buffer.from('dummy-sk'));

        const data = {
            jenis_surat: 'sk_dekan',
            nomorSurat: '005/SK/2025',
            tanggal_penetapan: '2025-01-01',
            menimbang: [{ content: 'a' }],
            mengingat: [{ content: 'b' }],
            memutuskan: [{ content: 'c' }]
        };

        const result = await service.processSuratGeneration(data, 'docx');

        expect(generateWordFile).toHaveBeenCalledWith(
            expect.stringContaining('.docx'),
            expect.objectContaining({
                nomor_surat: '005/SK/2025',
                tanggal_penetapan: expect.objectContaining({ full: '1 Januari 2025' })
            })
        );
        expect(result.fileName).toMatch(/Surat_Keputusan_/);
    });
});
