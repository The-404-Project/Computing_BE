const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- LIBRARY BARU UNTUK WATERMARK ---
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');

/**
 * Custom parser to enable dot notation access in Docxtemplater tags.
 */
const customParser = function(tag) {
    return {
        get: function(scope, context) {
            if (tag === '.') return scope;
            return tag.split('.').reduce(function(prev, curr) {
                return prev ? prev[curr] : undefined
            }, scope);
        }
    };
};

/**
 * 1. GENERATOR WORD (DOCX)
 */
const generateWordFile = (templateName, data) => {
    const templatePath = path.resolve(__dirname, '../templates/surat_templates', templateName);
    
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, { 
        paragraphLoop: true, 
        linebreaks: true,
        parser: customParser, 
        nullGetter: () => "" 
    });
    
    try {
        doc.render(data);
    } catch (error) {
        if (error.properties && error.properties.errors instanceof Array) {
            console.log("❌ ERROR TEMPLATE WORD:", error.properties.errors); 
        }
        throw error;
    }

    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

/**
 * 2. GENERATOR PDF (VIA CLI LIBREOFFICE)
 */
const generatePdfFile = (docxBuffer) => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        // Gunakan folder temp khusus konversi
        const outputDir = path.resolve(__dirname, '../../output/temp_conversion'); 

        // Ensure temp directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const inputPath = path.join(outputDir, `temp_${timestamp}.docx`);
        const expectedPdfPath = path.join(outputDir, `temp_${timestamp}.pdf`);

        // 1. Write DOCX buffer to a physical temp file
        try {
            fs.writeFileSync(inputPath, docxBuffer);
        } catch (err) {
            return reject(new Error("Gagal menulis file temporary: " + err.message));
        }

        // 2. Execute LibreOffice command (Headless mode)
        const command = `soffice --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`;

        console.log(`[PDF CLI] Executing: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`[PDF CLI ERROR]: ${error.message}`);
                if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return reject(error);
            }

            // 3. Check if PDF was successfully created
            if (fs.existsSync(expectedPdfPath)) {
                const pdfBuffer = fs.readFileSync(expectedPdfPath);

                // 4. Cleanup temporary files
                try {
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(expectedPdfPath);
                } catch (e) { console.warn("Failed to cleanup temp files:", e); }

                resolve(pdfBuffer);
            } else {
                console.error("[PDF ERROR] Output file not found!");
                console.error("LibreOffice Stderr:", stderr);
                if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                reject(new Error("Failed to generate PDF via CLI."));
            }
        });
    });
};

/**
 * 3. FUNGSI WATERMARK (MENGGUNAKAN PDF-LIB)
 * Menambahkan teks "PREVIEW MODE" diagonal di setiap halaman
 */
const addWatermarkToPdf = async (pdfBuffer) => {
    try {
        console.log("[Watermark] Menambahkan watermark 'PREVIEW'...");
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();

        pages.forEach(page => {
            const { width, height } = page.getSize();
            const text = 'PREVIEW MODE';
            const fontSize = 50;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            page.drawText(text, {
                x: (width / 2) - (textWidth / 2) - 40,
                y: height / 2,
                size: fontSize,
                font: font,
                color: rgb(0.7, 0.7, 0.7), // Abu-abu
                opacity: 0.3, // Transparan
                rotate: degrees(45), // Miring
            });
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);

    } catch (error) {
        console.error("❌ Gagal menambah watermark:", error);
        return pdfBuffer; // Kembalikan PDF asli jika gagal
    }
};

module.exports = { generateWordFile, generatePdfFile, addWatermarkToPdf };