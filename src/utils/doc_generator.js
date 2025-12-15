const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Set lokasi output folder
const OUTPUT_DIR = path.resolve(__dirname, '../../output/generated_documents');

// --- FUNGSI GENERATE DOCX ---
const generateDocx = (templateName, data, outputFilename) => {
    try {
        const templatePath = path.resolve(__dirname, '../templates', templateName);
        
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template ${templateName} tidak ditemukan di folder src/templates`);
        }

        // Baca file template
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Isi data ke template
        doc.render(data);

        // Generate buffer
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });

        // Simpan file
        const fullPath = path.join(OUTPUT_DIR, outputFilename);
        fs.writeFileSync(fullPath, buffer);

        console.log(`[DOCX] Berhasil dibuat: ${fullPath}`);
        return outputFilename; // Kembalikan nama filenya saja
    } catch (error) {
        console.error("Error generateDocx:", error);
        throw error;
    }
};

// --- FUNGSI GENERATE PDF ---
const generatePdf = (data, outputFilename) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const fullPath = path.join(OUTPUT_DIR, outputFilename);
            const writeStream = fs.createWriteStream(fullPath);

            doc.pipe(writeStream);

            // --- DESAIN PDF (Sederhana) ---
            doc.fontSize(20).text('SURAT KEPUTUSAN', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Halo ${data.nama || 'User'},`);
            doc.text(`Ini adalah dokumen PDF yang digenerate otomatis.`);
            doc.moveDown();
            
            // Contoh loop data jika ada array
            doc.text(`Detail Info:`);
            doc.text(`Jabatan: ${data.jabatan || '-'}`);
            doc.text(`Tanggal: ${new Date().toLocaleDateString()}`);

            doc.end();

            writeStream.on('finish', () => {
                console.log(`[PDF] Berhasil dibuat: ${fullPath}`);
                resolve(outputFilename);
            });

            writeStream.on('error', (err) => reject(err));

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateDocx, generatePdf };