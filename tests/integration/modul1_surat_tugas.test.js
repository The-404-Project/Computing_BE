
const request = require('supertest');
const app = require('../../src/app');
const Document = require('../../src/models/Document');
const { generateWordFile } = require('../../src/utils/doc_generator');

// Mock dependencies
jest.mock('../../src/models/Document');
jest.mock('../../src/utils/doc_generator');
// Mock console.log/error to keep test output clean
global.console = {
    ...console,
    // log: jest.fn(), 
    // error: jest.fn(),
};

describe('Integration: Modul 1 Surat Tugas', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('POST /api/surat-tugas/create should generate file and save to DB', async () => {
        // Mock Document.count for auto number generation
        Document.count.mockResolvedValue(5);
        
        // Mock Document.create
        Document.create.mockResolvedValue({ id: 1 });

        // Mock generator
        generateWordFile.mockReturnValue(Buffer.from('dummy-file-content'));

        const payload = {
            jenis_surat: 'surat_tugas_dosen',
            namaPegawai: 'Jane Doe',
            nip: '987654321',
            tujuanTugas: 'Bandung',
            keperluan: 'Rapat',
            tanggalMulai: '2025-11-01',
            tanggalSelesai: '2025-11-02'
        };

        const res = await request(app)
            .post('/api/surat-tugas/create')
            .send(payload)
            .expect(200);

        // Verify Headers
        expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(res.headers['content-disposition']).toMatch(/attachment; filename=SuratTugas_Jane_Doe_/);

        // Verify Database Interaction
        expect(Document.count).toHaveBeenCalled();
        expect(Document.create).toHaveBeenCalledWith(expect.objectContaining({
            doc_type: 'surat_tugas',
            status: 'generated',
            metadata: expect.objectContaining({
                namaPegawai: 'Jane Doe'
            })
        }));
    });
});
