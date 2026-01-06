const suratTugasService = require('./service');
const Document = require('../../models/Document');
const { Op } = require('sequelize');

// Auto Number Generator
const generateNomorSurat = async () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    
    const count = await Document.count({
        where: {
            doc_type: 'surat_tugas',
            created_at: { 
                [Op.gte]: new Date(year, today.getMonth(), 1),
                [Op.lt]: new Date(year, today.getMonth() + 1, 1)
            }
        }
    });
    
    return `${String(count + 1).padStart(3, '0')}/ST/FI/${month}/${year}`;
};

// --- CREATE / GENERATE FINAL ---
const generate = async (req, res) => {
    try {
        const requestedFormat = req.query.format || 'docx'; 
        const { nomorSurat, namaPegawai, nip, tujuanTugas, keperluan, tanggalMulai, tanggalSelesai, biaya, kendaraan, jabatan, pangkat, tanggalSurat, jenis_surat } = req.body;
        const user_id = req.user ? req.user.user_id : 1;

        // Auto Number jika kosong
        let finalNomorSurat = nomorSurat;
        if (!finalNomorSurat) {
            finalNomorSurat = await generateNomorSurat();
        }

        const payload = { ...req.body, nomorSurat: finalNomorSurat };

        // Panggil Service
        const result = await suratTugasService.processSuratTugasGeneration(payload, requestedFormat, false);

        // Simpan ke Database
        try {
            await Document.create({
                doc_number: finalNomorSurat,
                doc_type: 'surat_tugas',
                status: 'generated',
                created_by: user_id,
                file_path: result.filePath,
                metadata: {
                    jenis_surat, tanggalSurat,
                    namaPegawai, nip, jabatan, pangkat,
                    tujuanTugas, keperluan,
                    tanggalMulai, tanggalSelesai,
                    biaya, kendaraan,
                    generated_filename: result.fileName
                }
            });
            console.log(`[Modul 1] Document saved to DB: ${finalNomorSurat}`);
        } catch (dbError) {
            console.error('[Modul 1] DB Error:', dbError);
        }

        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length
        });
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 1 Error]', error);
        res.status(500).json({ message: 'Gagal membuat Surat Tugas', error: error.message });
    }
};

// --- PREVIEW ---
const preview = async (req, res) => {
    try {
        const { nomorSurat } = req.body;
        
        // Dummy number untuk preview
        let finalNomorSurat = nomorSurat || "XXX/PREVIEW/2025";
        const payload = { ...req.body, nomorSurat: finalNomorSurat };

        // Panggil Service dengan mode Preview = true
        const result = await suratTugasService.processSuratTugasGeneration(payload, 'pdf', true);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=preview.pdf',
            'Content-Length': result.buffer.length,
        });
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 1 Preview Error]', error);
        res.status(500).json({ message: 'Gagal preview', error: error.message });
    }
};

module.exports = { generate, preview };