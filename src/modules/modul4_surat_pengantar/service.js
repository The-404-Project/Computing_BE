const { generateWordFile, generatePdfFile } = require('../../utils/doc_Generator');

/**
 * Orchestrates the document generation process.
 * Handles template selection, data mapping, and format conversion (DOCX/PDF).
 */
const processSuratGeneration = async (data, format = 'docx') => {
    const { jenis_surat, metadata, content_blocks, dynamic_data } = data;

    // 1. Select template based on letter type
    // Template B is used for types requiring student data tables (e.g., Magang, Penelitian)
    let templateName = 'template_pengantarpermohonan_A.docx';
    if (['pengantar_magang', 'pengantar_penelitian'].includes(jenis_surat)) {
        templateName = 'template_pengantarpermohonan_B.docx';
    }

    // 2. Prepare data context for the template engine
    const context = {
        metadata, content_blocks, dynamic_data,
        today: new Date().toLocaleDateString('id-ID')
    };

    // 3. Generate base DOCX buffer
    const docxBuffer = generateWordFile(templateName, context);
    
    // 4. Handle format settings & PDF conversion if requested
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    if (format === 'pdf') {
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';
    }

    // 5. Construct sanitized filename
    const cleanPerihal = (metadata.perihal || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Surat_${cleanPerihal}_${Date.now()}.${ext}`;

    return { buffer: finalBuffer, fileName, mimeType };
};

module.exports = { processSuratGeneration };