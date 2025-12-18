const Document = require('./model'); // Import model lokal yang baru kita buat
const { Op } = require('sequelize');
const undanganService = require('./service');

// Fungsi Auto Number (Format: 001/UND/FI/10/2025)
const generateNomorSurat = async () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    
    // Hitung jumlah surat tipe 'surat_undangan' di bulan & tahun ini
    const count = await Document.count({
        where: {
            doc_type: 'surat_undangan',
            created_at: { 
                [Op.gte]: new Date(year, today.getMonth(), 1),
                [Op.lt]: new Date(year, today.getMonth() + 1, 1)
            }
        }
    });
    
    return `${String(count + 1).padStart(3, '0')}/UND/FI/${month}/${year}`;
};

const create = async (req, res) => {
    try {
        console.log("📥 [DEBUG] Data Masuk dari FE:", JSON.stringify(req.body, null, 2));
        // Ambil data dari Body (Termasuk list_tamu array)
        const { nomorSurat, perihal, kepada, tanggalAcara, tempat, list_tamu, agenda } = req.body;
        
        // Mock User ID (Nanti ganti dengan req.user.id dari middleware auth)
        const user_id = req.user ? req.user.user_id : 1; 

        // 1. Generate Nomor Surat Otomatis jika kosong
        let finalNomorSurat = nomorSurat;
        if (!finalNomorSurat) {
            finalNomorSurat = await generateNomorSurat();
        }

        // 2. Siapkan Payload untuk Service
        const requestedFormat = req.query.format || 'docx';
        const payload = { 
            ...req.body, 
            nomorSurat: finalNomorSurat,
            list_tamu: list_tamu // PENTING: Kirim array ini ke service
        };

        // 3. Proses Generate File
        const result = await undanganService.processSuratUndangan(payload, requestedFormat);

        // 4. Simpan Log ke Database (Tabel documents)
        await Document.create({
            doc_number: finalNomorSurat,
            doc_type: 'surat_undangan',
            status: 'generated', // Status berubah jadi generated
            created_by: user_id,
            // Simpan detail input di metadata (JSON)
            metadata: {
                perihal,
                kepada_display: kepada, // String gabungan untuk display cepat
                list_tamu_json: list_tamu, // Simpan array asli
                tanggal_acara: tanggalAcara,
                tempat,
                agenda,
                generated_filename: result.fileName
            }
        });

        // 5. Kirim File ke User
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length
        });
        
        res.send(result.buffer);

    } catch (error) {
        console.error('Error Modul 2:', error);
        res.status(500).json({ 
            message: 'Gagal membuat undangan', 
            error: error.message 
        });
    }
};

module.exports = { create };