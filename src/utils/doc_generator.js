const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Custom parser to enable dot notation access in Docxtemplater tags.
 * Allows nested data access like {metadata.nomor_surat} or {user.name}.
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
 * Generates a DOCX file buffer by rendering data into a template.
 * @param {string} templateName - Filename of the .docx template
 * @param {object} data - Data object to populate the template
 * @returns {Buffer} The generated DOCX buffer
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
    
    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

/**
 * Converts a DOCX buffer to PDF using a system-installed LibreOffice instance.
 * Strategy: Write temp file -> Execute CLI command -> Read result -> Cleanup.
 * @param {Buffer} docxBuffer - The DOCX file buffer
 * @returns {Promise<Buffer>} The generated PDF buffer
 */
const generatePdfFile = (docxBuffer) => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const outputDir = path.resolve(__dirname, '../../output'); 

        // Ensure temp directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const inputPath = path.join(outputDir, `temp_${timestamp}.docx`);
        const outputPath = path.join(outputDir, `temp_${timestamp}.pdf`);

        // 1. Write DOCX buffer to a physical temp file
        fs.writeFileSync(inputPath, docxBuffer);

        // 2. Execute LibreOffice command (Headless mode)
        // --outdir forces the output to the specific temp folder
        const command = `soffice --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`;

        console.log(`[PDF] Executing command: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`[PDF ERROR] Exec error: ${error}`);
                // Attempt cleanup even on failure
                if(fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                return reject(error);
            }

            // 3. Check if PDF was successfully created
            if (fs.existsSync(outputPath)) {
                console.log("[PDF] PDF created successfully. Reading buffer...");
                const pdfBuffer = fs.readFileSync(outputPath);

                // 4. Cleanup temporary files
                try {
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                } catch (e) { console.warn("Failed to cleanup temp files:", e); }

                resolve(pdfBuffer);
            } else {
                console.error("[PDF ERROR] Output file not found!");
                console.error("LibreOffice Stderr:", stderr);
                reject(new Error("Failed to generate PDF via CLI."));
            }
        });
    });
};

module.exports = { generateWordFile, generatePdfFile };