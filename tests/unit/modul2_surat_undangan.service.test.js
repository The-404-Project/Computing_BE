
const suratUndanganService = require('../../src/modules/modul2_surat_undangan/service');
const { generateWordFile, generatePdfFile } = require('../../src/utils/doc_generator');
const Template = require('../../src/models/Template');

jest.mock('../../src/utils/doc_generator');
jest.mock('../../src/models/Template');
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
}));

describe('Modul 2: Surat Undangan Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockData = {
        jenis_surat: 'undangan_rapat',
        nomorSurat: '001/UND/FI/10/2025',
        lampiran: '1 Lembar',
        tanggalAcara: '2025-10-25',
        lokasi: 'Ruang Sidang',
        agenda: 'Rapat Koordinasi',
        list_tamu: ['Dosen A', 'Dosen B'],
        waktuMulai: '09:00',
        waktuSelesai: '11:00'
    };

    it('should generate DOCX successfully', async () => {
        const mockBuffer = Buffer.from('mock-undangan-docx');
        generateWordFile.mockReturnValue(mockBuffer);

        const result = await suratUndanganService.processSuratUndangan(mockData, 'docx');

        expect(generateWordFile).toHaveBeenCalledWith(
            expect.anything(), // Template name might vary
            expect.objectContaining({
                nomor_surat: '001/UND/FI/10/2025',
                hari_acara: 'Sabtu', // 25 Oct 2025 is Saturday
                waktu: '09:00 - 11:00 WIB'
            })
        );
        expect(result).toEqual({
            buffer: mockBuffer,
            fileName: expect.stringMatching(/^SuratUndangan_.*\.docx$/),
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    });
});
