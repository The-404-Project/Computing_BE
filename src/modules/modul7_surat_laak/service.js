const { generateWordFile, generatePdfFile, addWatermarkToPdf } = require('../../utils/doc_generator');
const fs = require('fs');
const path = require('path');

// Process Surat LAAK (Hardcoded Template Logic)
const processSuratLAAK = async (data, format = 'docx', isPreview = false) => {
    // 1. Destructure Data
    const { 
        jenisSurat, nomorSurat, perihal, unit, tanggal, 
        referensi, pembuka, isi, penutup, 
        kriteriaList, lampiranList 
    } = data;

    // 2. Pilih Template (HARDCODED)
    // Apapun jenis suratnya, kita paksa pakai satu template default dulu.
    // Nanti kalau butuh beda template per jenis surat, tinggal tambah IF/ELSE di sini.
    let templateName = 'template_laak_default.docx'; 

    /* Contoh kalau mau beda template per jenis surat (hardcoded style):
       if (jenisSurat === 'Laporan Audit Internal') {
           templateName = 'template_laak_audit.docx';
       }
    */

    // 3. Siapkan Data Context (Mapping variable ke Word)
    const context = {
        nomor_surat: nomorSurat || "XXX/LAAK/DRAFT",
        perihal: perihal || "-",
        unit: unit || "-",
        tanggal: tanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        referensi: referensi || "-",
        
        // Konten Naskah
        pembuka: pembuka || "",
        isi: isi || "",
        penutup: penutup || "",

        // Loop Data (Table di Word: {#list_kriteria}...{/list_kriteria})
        list_kriteria: (kriteriaList || []).map((item, index) => ({
            no: index + 1, // Tambah properti 'no'
            ...item
        })),
        
        list_lampiran: (lampiranList || []).map((item, index) => ({
            no: index + 1, // Tambah properti 'no'
            ...item
        }))
    };

    // 4. Generate Word Buffer
    const docxBuffer = generateWordFile(templateName, context);
    
    // 5. Handle Format & Watermark
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    if (format === 'pdf' || isPreview) {
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';

        // --- FITUR WATERMARK PREVIEW ---
        if (isPreview) {
            finalBuffer = await addWatermarkToPdf(finalBuffer);
        }
    }

    // 6. Penamaan File
    const safeUnit = (unit || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `LAAK_${safeUnit}_${Date.now()}.${ext}`;
    let fullPath = null;

    // 7. Save Logic (Hanya simpan jika BUKAN Preview)
    if (!isPreview) {
        const outputDir = path.resolve(__dirname, '../../../output/generated_documents');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fullPath = path.join(outputDir, fileName);
        
        try {
            fs.writeFileSync(fullPath, finalBuffer);
            console.log(`[Modul 7] File disimpan permanen: ${fullPath}`);
        } catch (err) {
            console.error('[Modul 7] Gagal menyimpan file fisik:', err);
        }
    } else {
        console.log('[Modul 7] Mode Preview: File tidak disimpan ke disk.');
    }

    return { buffer: finalBuffer, fileName, mimeType, filePath: fullPath };
};

module.exports = { processSuratLAAK };