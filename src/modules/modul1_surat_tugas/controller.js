const suratTugasService = require('./service');
const Document = require('../../models/Document');
const { Op } = require('sequelize');

/**
 * Fungsi Auto Number (Format: 001/ST/FI/MM/YYYY)
 */
const generateNomorSurat = async () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    
    // Hitung jumlah surat tipe 'surat_tugas' di bulan & tahun ini
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

/**
 * Controller Modul 1: Handle request pembuatan Surat Tugas.
 */
const generate = async (req, res) => {
    try {
        const requestedFormat = req.query.format || 'docx'; 
        
        console.log(`[Modul 1] Generating ${req.body.jenis_surat} -> ${requestedFormat.toUpperCase()}`);

        // Ambil data dari Body
        const { nomorSurat, jenis_surat, namaPegawai, nip, pangkat, jabatan, tujuanTugas, keperluan, tanggalMulai, tanggalSelesai, biaya, kendaraan } = req.body;
        
        // Mock User ID (Nanti ganti dengan req.user.id dari middleware auth)
        const user_id = req.user ? req.user.user_id : 1;

        // 1. Generate Nomor Surat Otomatis jika kosong
        let finalNomorSurat = nomorSurat;
        if (!finalNomorSurat) {
            finalNomorSurat = await generateNomorSurat();
        }

        // 2. Siapkan Payload untuk Service
        const payload = { 
            ...req.body, 
            nomorSurat: finalNomorSurat
        };

        // 3. Panggil Service khusus Surat Tugas
        const result = await suratTugasService.processSuratTugasGeneration(payload, requestedFormat);

        // 4. Simpan Log ke Database (Tabel documents) - Jangan block jika error
        try {
            await Document.create({
                doc_number: finalNomorSurat,
                doc_type: 'surat_tugas',
                status: 'generated',
                created_by: user_id,
                // Simpan detail input di metadata (JSON)
                metadata: {
                    jenis_surat,
                    namaPegawai,
                    nip,
                    pangkat,
                    jabatan,
                    tujuanTugas,
                    keperluan,
                    tanggalMulai,
                    tanggalSelesai,
                    biaya,
                    kendaraan,
                    generated_filename: result.fileName
                }
            });
            console.log(`[Modul 1] Document saved to database: ${finalNomorSurat}`);
        } catch (dbError) {
            console.error('[Modul 1] Error saving to database:', dbError);
            // Continue anyway, don't block file download
        }

        // 5. Set headers agar browser mendownload file
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length
        });

        // 6. Kirim binary data
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 1 Error]', error);
        res.status(500).json({ message: 'Failed to generate Surat Tugas', error: error.message });
    }
};

module.exports = { generate };