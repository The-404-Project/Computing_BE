const Document = require('./model'); // Pastikan import model lokal
const { Op } = require('sequelize');
const undanganService = require('./service');

// ... (Fungsi generateNomorSurat biarkan tetap sama) ...
const generateNomorSurat = async () => {
    // ... logic auto number ...
    // (Copy dari kode kamu sebelumnya)
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const count = await Document.count({
        where: {
            doc_type: 'surat_undangan',
            created_at: {
                [Op.gte]: new Date(year, today.getMonth(), 1),
                [Op.lt]: new Date(year, today.getMonth() + 1, 1),
            },
        },
    });
    return `${String(count + 1).padStart(3, '0')}/UND/FI/${month}/${year}`;
};

const create = async (req, res) => {
    try {
        const { nomorSurat, perihal, kepada, tanggalAcara, tempat, list_tamu, agenda } = req.body;
        const user_id = req.user ? req.user.user_id : 1;

        let finalNomorSurat = nomorSurat; // isinya ""
        if (!finalNomorSurat) {
            finalNomorSurat = await generateNomorSurat(); // TRIGGERED ✅
        }

        const requestedFormat = req.query.format || 'docx';
        const payload = {
            ...req.body,
            nomorSurat: finalNomorSurat,
            list_tamu: list_tamu,
        };

        // 1. Panggil Service (Sekarang service mengembalikan filePath juga)
        const result = await undanganService.processSuratUndangan(payload, requestedFormat);

        // 2. Simpan ke Database
        try {
            await Document.create({
                doc_number: finalNomorSurat,
                doc_type: 'surat_undangan',
                status: 'generated',
                created_by: user_id,
                // SIMPAN PATH FILE FISIK DI SINI
                file_path: result.filePath,
                metadata: {
                    perihal,
                    kepada_display: kepada,
                    list_tamu_json: list_tamu,
                    tanggal_acara: tanggalAcara,
                    tempat,
                    agenda,
                    generated_filename: result.fileName,
                },
            });
            console.log(`[Modul 2] Document saved to database: ${finalNomorSurat}`);
        } catch (dbError) {
            console.error('[Modul 2] Error saving to database:', dbError);
        }

        // 3. Kirim File ke User
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length,
        });

        res.send(result.buffer);
    } catch (error) {
        console.error('Error Modul 2:', error);
        res.status(500).json({
            message: 'Gagal membuat undangan',
            error: error.message,
        });
    }
};

const preview = async (req, res) => {
    try {
        const { nomorSurat, list_tamu } = req.body;

        // Logic Nomor Surat (Untuk preview, kalau kosong kita kasih dummy saja biar cepat)
        let finalNomorSurat = nomorSurat || "XXX/PREVIEW/2025";

        const payload = {
            ...req.body,
            nomorSurat: finalNomorSurat,
            list_tamu: list_tamu,
        };

        const result = await undanganService.processSuratUndangan(payload, 'pdf', true);

        // Langsung kirim buffer ke Frontend
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=preview.pdf',
            'Content-Length': result.buffer.length,
        });

        res.send(result.buffer);

    } catch (error) {
        console.error('Error Preview Modul 2:', error);
        res.status(500).json({
            message: 'Gagal membuat preview',
            error: error.message,
        });
    }
};

module.exports = { create, preview };