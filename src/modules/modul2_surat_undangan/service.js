const { generateWordFile, generatePdfFile } = require('../../utils/doc_generator');
const fs = require('fs');   // Tambahkan ini
const path = require('path'); // Tambahkan ini

// ... (Helper getNamaHari & formatTanggalIndo biarkan tetap sama) ...
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

const processSuratUndangan = async (data, format = 'docx') => {
    // 1. Destructure Data
    const {
        nomorSurat, lampiran, perihal,
        tanggalAcara, tempat, agenda,
        list_tamu, waktuMulai, waktuAcara, waktuSelesai
    } = data;

    // ... (Logic Tanggal & Waktu biarkan tetap sama) ...
    const hari_acara = getNamaHari(tanggalAcara);
    const tgl_acara = formatTanggalIndo(tanggalAcara);
    const today_indo = formatTanggalIndo(new Date());

    const jamMulai = waktuMulai || waktuAcara;
    let waktu_fix = "-";
    if (jamMulai) {
        if (waktuSelesai) {
            waktu_fix = `${jamMulai} - ${waktuSelesai} WIB`;
        } else {
            waktu_fix = `${jamMulai} WIB`;
        }
    }

    // ... (Logic List Tamu & Page Break biarkan tetap sama) ...
    let listTamuReady = [];
    if (list_tamu && Array.isArray(list_tamu)) {
        listTamuReady = list_tamu.map((tamu, index) => {
            const namaTamu = typeof tamu === 'string' ? tamu : tamu.nama;
            const isLastItem = index === list_tamu.length - 1;
            return {
                nama: namaTamu,
                showPageBreak: !isLastItem
            };
        });
    }

    // Masukkan ke Context
    const context = {
        nomor_surat: nomorSurat || "XXX/UND/FI/2025",
        lampiran: lampiran || "-",
        perihal: perihal || "Undangan",
        hari: hari_acara,
        tanggal: tgl_acara,
        waktu: waktu_fix,
        tempat: tempat || "-",
        agenda: agenda || "-",
        tanggal_surat: today_indo,
        list_tamu: listTamuReady
    };

    // Generate File
    const templateName = 'template_undangan.docx';
    const docxBuffer = generateWordFile(templateName, context);

    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';
    
    // Nama file unik
    const cleanPerihal = (perihal || 'Surat').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const fileName = `Undangan_${cleanPerihal}_${Date.now()}.${ext}`;

    if (format === 'pdf') {
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';
        // fileName otomatis berubah jadi .pdf di logic generatePdfFile biasanya, tapi kita set ulang biar aman
        // Note: Kalau generatePdfFile mengembalikan buffer, kita pakai fileName yg kita buat
    }

    // --- LOGIC SIMPAN FILE KE FOLDER BE ---
    
    // 1. Tentukan folder tujuan (Naik 3 level dari modul ke root -> output -> generated_documents)
    const outputDir = path.resolve(__dirname, '../../../output/generated_documents');

    // 2. Buat folder jika belum ada
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 3. Gabungkan path folder + nama file
    const fullPath = path.join(outputDir, fileName);

    // 4. Tulis file fisik ke server
    try {
        fs.writeFileSync(fullPath, finalBuffer);
        console.log(`[Service] File saved successfully at: ${fullPath}`);
    } catch (err) {
        console.error('[Service] Failed to save file locally:', err);
    }

    // Kembalikan buffer (untuk download) DAN fullPath (untuk database)
    return { buffer: finalBuffer, fileName, mimeType, filePath: fullPath };
};

module.exports = { processSuratUndangan };