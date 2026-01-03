
const service = require('../../src/modules/modul4_surat_pengantar/service');
const { generateWordFile } = require('../../src/utils/doc_generator');

jest.mock('../../src/utils/doc_generator');
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

describe('Modul 4: Surat Pengantar Service', () => {
    it('should generate DOCX successfully', async () => {
        generateWordFile.mockReturnValue(Buffer.from('dummy-pengantar'));

        const data = {
            jenis_surat: 'pengantar_umum',
            nomorSurat: '004/SP/2025',
            metadata: { perihal: 'Permohonan Data' },
            content_blocks: [],
            dynamic_data: {}
        };

        const result = await service.processSuratGeneration(data, 'docx');

        expect(generateWordFile).toHaveBeenCalledWith(
            'template_pengantarpermohonan_A.docx',
            expect.objectContaining({ nomor_surat: '004/SP/2025' })
        );
        expect(result.fileName).toMatch(/Surat_Permohonan_Data_/);
    });
});
