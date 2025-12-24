// File: src/modules/modul4_surat_pengantar/service.js

const { generateWordFile, generatePdfFile, addWatermarkToPdf } = require('../../utils/doc_generator');
const fs = require('fs');
const path = require('path');

const processSuratGeneration = async (data, format = 'docx', isPreview = false) => {
    const { jenis_surat, nomorSurat, metadata, content_blocks, dynamic_data } = data;

    // 1. Pilih Template
    // Template B digunakan untuk surat yang butuh tabel (Magang/Penelitian)
    let templateName = 'template_pengantarpermohonan_A.docx';
    if (['pengantar_magang', 'pengantar_penelitian'].includes(jenis_surat)) {
        templateName = 'template_pengantarpermohonan_B.docx';
    }

    // 2. Siapkan Data Context
    const context = {
        nomor_surat: nomorSurat || "XXX/DRAFT/2025",
        metadata, 
        content_blocks, 
        dynamic_data,
        today: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    // 3. Generate Word Buffer
    const docxBuffer = generateWordFile(templateName, context);
    
    // 4. Handle Format & Watermark
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    if (format === 'pdf' || isPreview) {
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';

        // --- FITUR BARU: WATERMARK PREVIEW ---
        if (isPreview) {
            finalBuffer = await addWatermarkToPdf(finalBuffer);
        }
    }

    // 5. Penamaan File
    const cleanPerihal = (metadata?.perihal || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `Surat_${cleanPerihal}_${Date.now()}.${ext}`;
    let fullPath = null;

    // 6. Save Logic (Hanya simpan jika BUKAN Preview)
    if (!isPreview) {
        const outputDir = path.resolve(__dirname, '../../../output/generated_documents');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fullPath = path.join(outputDir, fileName);
        try {
            fs.writeFileSync(fullPath, finalBuffer);
            console.log(`[Modul 4] File disimpan permanen: ${fullPath}`);
        } catch (err) {
            console.error('[Modul 4] Gagal menyimpan file fisik:', err);
        }
    } else {
        console.log('[Modul 4] Mode Preview: File tidak disimpan ke disk.');
    }

    return { buffer: finalBuffer, fileName, mimeType, filePath: fullPath };
};

module.exports = { processSuratGeneration };