// File: src/modules/modul2_surat_undangan/controller.js

const Document = require('./model'); // Pastikan import model lokal
const { Op } = require('sequelize');
const undanganService = require('./service');

// Fungsi Auto Number
const generateNomorSurat = async () => {
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
        // PERBAIKAN: Ambil 'lokasi' dari body, bukan 'tempat'
        const { nomorSurat, perihal, kepada, tanggalAcara, lokasi, list_tamu, agenda } = req.body;
        const user_id = req.user ? req.user.user_id : 1;

        // 1. Generate Nomor Surat jika kosong
        let finalNomorSurat = nomorSurat;
        if (!finalNomorSurat) {
            finalNomorSurat = await generateNomorSurat();
        }

        const requestedFormat = req.query.format || 'docx';
        const payload = {
            ...req.body,
            nomorSurat: finalNomorSurat,
            list_tamu: list_tamu,
        };

        // 2. Panggil Service
        const result = await undanganService.processSuratUndangan(payload, requestedFormat);

        // 3. Simpan Log ke Database
        try {
            await Document.create({
                doc_number: finalNomorSurat,
                doc_type: 'surat_undangan',
                status: 'generated',
                created_by: user_id,
                file_path: result.filePath,
                metadata: {
                    perihal,
                    kepada_display: kepada,
                    list_tamu_json: list_tamu,
                    tanggal_acara: tanggalAcara,
                    
                    // PERBAIKAN: Simpan data lokasi ke field tempat di metadata
                    tempat: lokasi, 
                    
                    agenda,
                    generated_filename: result.fileName,
                },
            });
            console.log(`[Modul 2] Document saved to database: ${finalNomorSurat}`);
        } catch (dbError) {
            console.error('[Modul 2] Error saving to database:', dbError);
        }

        // 4. Kirim File ke User
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

        // Logic Nomor Surat Dummy untuk Preview
        let finalNomorSurat = nomorSurat || "XXX/PREVIEW/2025";

        const payload = {
            ...req.body,
            nomorSurat: finalNomorSurat,
            list_tamu: list_tamu,
        };

        // Panggil Service dengan mode preview = true
        const result = await undanganService.processSuratUndangan(payload, 'pdf', true);

        // Langsung kirim buffer ke Frontend (Inline)
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