const Document = require('../../models/Document');
const { Op } = require('sequelize');
const undanganService = require('./service');

// Fungsi Auto Number
const generateNomorSurat = async () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    
    // Hitung surat tipe 'surat_undangan' bulan ini
    const count = await Document.count({
        where: {
            doc_type: 'surat_undangan',
            created_at: { [Op.gte]: new Date(year, today.getMonth(), 1) }
        }
    });
    return `${String(count + 1).padStart(3, '0')}/UND/FI/${month}/${year}`;
};

const create = async (req, res) => {
    try {
        const { nomorSurat, perihal, kepada, tanggalAcara, tempat } = req.body;
        const user_id = req.user ? req.user.user_id : 1; 

        // 1. Generate Nomor jika kosong
        let finalNomorSurat = nomorSurat;
        if (!finalNomorSurat) {
            finalNomorSurat = await generateNomorSurat();
        }

        // 2. Panggil Service buat File
        const requestedFormat = req.query.format || 'docx';
        const payload = { ...req.body, nomorSurat: finalNomorSurat };
        const result = await undanganService.processSuratUndangan(payload, requestedFormat);

        // 3. Simpan Log ke Database
        await Document.create({
            doc_number: finalNomorSurat,
            doc_type: 'surat_undangan', // Penanda Modul 2
            status: 'draft',
            created_by: user_id,
            metadata: {
                perihal, kepada, tanggal_acara: tanggalAcara, tempat,
                generated_file: result.fileName
            }
        });

        // 4. Kirim File ke Frontend
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length
        });
        res.send(result.buffer);

    } catch (error) {
        console.error('Error Modul 2:', error);
        res.status(500).json({ message: 'Gagal membuat undangan', error: error.message });
    }
};

module.exports = { create };