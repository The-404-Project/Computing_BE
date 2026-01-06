const service = require('./service');
const Document = require('./model');
const { Op } = require('sequelize');

// Helper Auto Number (Backup jika frontend kosong)
const generateNomorSurat = async () => {
    const year = new Date().getFullYear();
    const count = await Document.count({
        where: {
            doc_type: 'surat_laak',
            created_at: {
                [Op.gte]: new Date(year, 0, 1), // Hitung mulai awal tahun
                [Op.lt]: new Date(year + 1, 0, 1)
            }
        }
    });
    
    return `${String(count + 1).padStart(3, '0')}`;
};

// --- GENERATE NOMOR (API untuk Frontend) ---
const generateNomor = async (req, res) => {
    try {
        const nomor = await generateNomorSurat();
        res.json({ nomor }); // ⬅️ ini yang bikin data.nomor bisa dipakai
    } catch (error) {
        console.error('[Modul 7] Generate Nomor Error:', error);
        res.status(500).json({ message: 'Gagal generate nomor surat' });
    }
};


// --- CREATE (Export Final) ---
const create = async (req, res) => {
    try {
        const requestedFormat = req.query.format || 'docx';
        const { nomorSurat, ...restBody } = req.body;
        const user_id = req.user ? req.user.user_id : 1;

        // 1. Handle Nomor Surat
        let finalNomor = nomorSurat;
        if (!finalNomor) {
            finalNomor = await generateNomorSurat();
        }

        const payload = { ...restBody, nomorSurat: finalNomor };

        // 2. Service Process
        const result = await service.processSuratLAAK(payload, requestedFormat, false);

        // 3. Simpan ke Database
        try {
            await Document.create({
                doc_number: finalNomor,
                doc_type: 'surat_laak',
                status: 'generated',
                created_by: user_id,
                file_path: result.filePath,
                metadata: {
                    ...payload,
                    generated_filename: result.fileName
                }
            });
        } catch (dbErr) {
            console.error('[Modul 7] DB Error:', dbErr);
        }

        // 4. Response
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length
        });
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 7] Create Error:', error);
        res.status(500).json({ message: 'Gagal membuat surat LAAK', error: error.message });
    }
};

// --- PREVIEW (Watermark) ---
const preview = async (req, res) => {
    try {
        const { nomorSurat, ...restBody } = req.body;
        
        // Nomor dummy untuk preview
        const finalNomor = nomorSurat || "XXX/LAAK/PREVIEW";
        const payload = { ...restBody, nomorSurat: finalNomor };

        // Force PDF untuk preview di browser
        const result = await service.processSuratLAAK(payload, 'pdf', true);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=preview_laak.pdf',
            'Content-Length': result.buffer.length
        });
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 7] Preview Error:', error);
        res.status(500).json({ message: 'Gagal preview surat', error: error.message });
    }
};

module.exports = { create, preview, generateNomorSurat, generateNomor };