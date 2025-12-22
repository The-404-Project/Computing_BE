// File: src/modules/modul2_surat_undangan/service.js

// Import watermark juga
const { generateWordFile, generatePdfFile, addWatermarkToPdf } = require('../../utils/doc_generator');
const fs = require('fs');
const path = require('path');

// --- HELPER FUNCTIONS ---
const getNamaHari = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
};

const formatTanggalIndo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// --- MAIN SERVICE FUNCTION ---
const processSuratUndangan = async (data, format = 'docx', isPreview = false) => {
    
    // 1. Destructure Data
    const { 
        jenis_surat, nomorSurat, lampiran, 
        tanggalAcara, tempat, agenda,
        list_tamu, waktuMulai, waktuAcara, waktuSelesai 
    } = data;

    // 2. Logic Format Tanggal & Waktu
    const hari_acara = getNamaHari(tanggalAcara);
    const tgl_acara = formatTanggalIndo(tanggalAcara);
    const today_indo = formatTanggalIndo(new Date());
    
    const jamMulai = waktuMulai || waktuAcara; 
    let waktu_fix = "-";
    if (jamMulai) {
         waktu_fix = waktuSelesai ? `${jamMulai} - ${waktuSelesai} WIB` : `${jamMulai} WIB`;
    }

    // 3. Logic Perihal Otomatis
    let perihal_otomatis = "Undangan"; 
    
    // Cek apakah menggunakan template kustom (format: template_123)
    if (jenis_surat && jenis_surat.startsWith('template_')) {
        const templateId = parseInt(jenis_surat.replace('template_', ''));
        if (!isNaN(templateId)) {
            try {
                const Template = require('../../models/Template');
                const template = await Template.findOne({ 
                    where: { 
                        template_id: templateId,
                        is_active: true 
                    } 
                });
                
                if (template && template.template_name) {
                    // Gunakan nama template sebagai perihal
                    perihal_otomatis = template.template_name;
                    console.log(`[Modul 2] Using template name as perihal: ${perihal_otomatis}`);
                } else {
                    console.warn(`[Modul 2] Template ID ${templateId} not found, using default perihal`);
                }
            } catch (templateError) {
                console.error('[Modul 2] Error loading template from database:', templateError);
                // Fallback ke default
            }
        }
    } else {
        // Template default
        if (jenis_surat === 'undangan_rapat') perihal_otomatis = "Undangan Rapat";
        else if (jenis_surat === 'undangan_seminar') perihal_otomatis = "Undangan Seminar";
        else if (jenis_surat === 'undangan_kegiatan') perihal_otomatis = "Undangan Kegiatan";
    }

    // 4. Logic Mail Merge (Jabatan & Page Break)
    let listTamuReady = [];
    if (list_tamu && Array.isArray(list_tamu)) {
        listTamuReady = list_tamu.map((tamu, index) => {
            const namaTamu = typeof tamu === 'string' ? tamu : tamu.nama;
            const jabatanTamu = (typeof tamu === 'object' && tamu.jabatan) ? tamu.jabatan : null;
            const isLastItem = index === list_tamu.length - 1;

            return { 
                nama: namaTamu,
                jabatan: jabatanTamu,
                showPageBreak: !isLastItem 
            };
        });
    }

    // 5. Masukkan Data ke Context
    const context = {
        nomor_surat: nomorSurat || "XXX/UND/FI/2025",
        lampiran: lampiran || "-",
        perihal: perihal_otomatis, 
        hari: hari_acara,
        tanggal: tgl_acara,
        waktu: waktu_fix,
        tempat: tempat || "-",
        agenda: agenda || "-",
        tanggal_surat: today_indo,
        list_tamu: listTamuReady 
    };

    // 6. Generate Word Buffer
    // Cek apakah menggunakan template kustom
    let templateName = 'template_undangan.docx'; // Default
    let templatePath = null;
    
    if (jenis_surat && jenis_surat.startsWith('template_')) {
        const templateId = parseInt(jenis_surat.replace('template_', ''));
        if (!isNaN(templateId)) {
            try {
                const Template = require('../../models/Template');
                const template = await Template.findOne({ 
                    where: { 
                        template_id: templateId,
                        is_active: true 
                    } 
                });
                
                if (template && template.file_path) {
                    // Extract filename dari file_path
                    const path = require('path');
                    const fileName = path.basename(template.file_path);
                    templateName = fileName;
                    templatePath = template.file_path;
                    console.log(`[Modul 2] Using custom template: ${template.template_name} (${fileName})`);
                } else {
                    console.warn(`[Modul 2] Template ID ${templateId} not found, using default template`);
                }
            } catch (templateError) {
                console.error('[Modul 2] Error loading template from database:', templateError);
                // Fallback ke default
            }
        }
    }
    
    // Generate DOCX Buffer
    let docxBuffer;
    if (templatePath) {
        const fs = require('fs');
        const path = require('path');
        const PizZip = require('pizzip');
        const Docxtemplater = require('docxtemplater');
        
        const fullPath = path.resolve(__dirname, '../../', templatePath);
        if (fs.existsSync(fullPath)) {
            console.log(`[Modul 2] Using template from database: ${fullPath}`);
            // Baca template dari path database
            const content = fs.readFileSync(fullPath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, { 
                paragraphLoop: true, 
                linebreaks: true,
                nullGetter: () => "" 
            });
            doc.render(context);
            docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        } else {
            console.warn(`[Modul 2] Template file not found at ${fullPath}, using default`);
            docxBuffer = generateWordFile(templateName, context);
        }
    } else {
        docxBuffer = generateWordFile(templateName, context);
    }

    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    // 7. Logic PDF & Preview
    if (format === 'pdf' || isPreview) {
        // Generate PDF bersih via LibreOffice
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';

        // --- CEK APAKAH INI PREVIEW? JIKA YA, TAMBAH WATERMARK ---
        if (isPreview) {
            finalBuffer = await addWatermarkToPdf(finalBuffer);
        }
        // ---------------------------------------------------------
    }

    // 8. Penamaan File
    const safeName = perihal_otomatis.replace(/\s+/g, '_'); 
    const fileName = `${safeName}_${Date.now()}.${ext}`;

    let fullPath = null;

    // --- 9. SAVE LOGIC: HANYA SIMPAN JIKA BUKAN PREVIEW ---
    if (!isPreview) {
        // Simpan ke folder permanent jika bukan preview
        const outputDir = path.resolve(__dirname, '../../../output/generated_documents');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fullPath = path.join(outputDir, fileName);

        try {
            fs.writeFileSync(fullPath, finalBuffer);
            console.log(`[Service] File disimpan permanen: ${fullPath}`);
        } catch (err) {
            console.error('[Service] Gagal menyimpan file:', err);
        }
    } else {
        console.log('[Service] Mode Preview: File TIDAK disimpan ke storage.');
    }

    // 10. Return Data
    return { 
        buffer: finalBuffer, 
        fileName: fileName, 
        mimeType: mimeType, 
        filePath: fullPath 
    };
};

module.exports = { processSuratUndangan };