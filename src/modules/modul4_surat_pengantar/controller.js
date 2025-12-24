const suratService = require('./service');
const Document = require('./model'); // Pastikan pakai model lokal di folder ini
const { Op } = require('sequelize');

// --- Helper: Auto Number ---
const generateNomorSurat = async (jenis_surat) => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  const prefix = jenis_surat && jenis_surat.includes('permohonan') ? 'PM' : 'SP';
  const docType = jenis_surat && jenis_surat.includes('permohonan') ? 'surat_permohonan' : 'surat_pengantar';

  const count = await Document.count({
    where: {
      doc_type: docType,
      created_at: {
        [Op.gte]: new Date(year, today.getMonth(), 1),
        [Op.lt]: new Date(year, today.getMonth() + 1, 1),
      },
    },
  });

  return `${String(count + 1).padStart(3, '0')}/${prefix}/FI/${month}/${year}`;
};

// --- 1. CREATE (Export Final) ---
const create = async (req, res) => {
  try {
    const requestedFormat = req.query.format || 'docx';
    const { nomorSurat, jenis_surat, metadata, content_blocks, dynamic_data } = req.body;
    const user_id = req.user ? req.user.user_id : 1;

    // A. Generate Nomor
    let finalNomorSurat = nomorSurat;
    if (!finalNomorSurat) {
      finalNomorSurat = await generateNomorSurat(jenis_surat);
    }

    // B. Panggil Service (isPreview = false)
    const payload = { ...req.body, nomorSurat: finalNomorSurat };
    const result = await suratService.processSuratGeneration(payload, requestedFormat, false);

    // C. Simpan ke Database
    const docType = jenis_surat && jenis_surat.includes('permohonan') ? 'surat_permohonan' : 'surat_pengantar';
    
    try {
      await Document.create({
        doc_number: finalNomorSurat,
        doc_type: docType,
        status: 'generated',
        created_by: user_id,
        file_path: result.filePath,
        metadata: {
          jenis_surat,
          ...metadata,
          content_blocks,
          dynamic_data,
          generated_filename: result.fileName,
        },
      });
      console.log(`[Modul 4] DB Saved: ${finalNomorSurat}`);
    } catch (dbError) {
      console.error('[Modul 4] DB Save Error:', dbError);
    }

    // D. Response Download
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename=${result.fileName}`,
      'Content-Length': result.buffer.length,
    });
    res.send(result.buffer);

  } catch (error) {
    console.error('[Modul 4 Create Error]', error);
    res.status(500).json({ message: 'Gagal membuat surat', error: error.message });
  }
};

// --- 2. PREVIEW (Lihat Draft) ---
const preview = async (req, res) => {
    try {
        const { nomorSurat } = req.body;
        
        // Pakai nomor dummy buat preview
        const finalNomorSurat = nomorSurat || "XXX/PREVIEW/2025";
        
        const payload = { ...req.body, nomorSurat: finalNomorSurat };

        // Panggil Service dengan mode PREVIEW = TRUE
        // (Format dipaksa PDF agar browser bisa render)
        const result = await suratService.processSuratGeneration(payload, 'pdf', true);

        // Response Inline (Langsung tampil di browser/iframe)
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=preview_draft.pdf',
            'Content-Length': result.buffer.length,
        });
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 4 Preview Error]', error);
        res.status(500).json({ message: 'Gagal generate preview', error: error.message });
    }
};

module.exports = { create, preview };