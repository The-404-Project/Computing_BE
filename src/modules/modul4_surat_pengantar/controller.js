const suratService = require('./service');

/**
 * Controller to handle document generation requests.
 * Accepts JSON data and returns a downloadable file (DOCX or PDF).
 */
const generate = async (req, res) => {
    try {
        const requestedFormat = req.query.format || 'docx'; 
        
        console.log(`[Modul 4] Generating ${req.body.jenis_surat} -> ${requestedFormat.toUpperCase()}`);

        // Process data and generate document buffer via service
        const result = await suratService.processSuratGeneration(req.body, requestedFormat);

        // Set headers to trigger file download in the browser
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length
        });

        // Send binary data
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 4 Error]', error);
        res.status(500).json({ message: 'Failed to generate document', error: error.message });
    }
};

module.exports = { generate };