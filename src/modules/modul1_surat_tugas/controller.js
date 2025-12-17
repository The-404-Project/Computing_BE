const suratTugasService = require('./service');

/**
 * Controller Modul 1: Handle request pembuatan Surat Tugas.
 */
const generate = async (req, res) => {
    try {
        const requestedFormat = req.query.format || 'docx'; 
        
        console.log(`[Modul 1] Generating ${req.body.jenis_surat} -> ${requestedFormat.toUpperCase()}`);

        // Panggil Service khusus Surat Tugas
        const result = await suratTugasService.processSuratTugasGeneration(req.body, requestedFormat);

        // Set headers agar browser mendownload file
        res.set({
            'Content-Type': result.mimeType,
            'Content-Disposition': `attachment; filename=${result.fileName}`,
            'Content-Length': result.buffer.length
        });

        // Kirim binary data
        res.send(result.buffer);

    } catch (error) {
        console.error('[Modul 1 Error]', error);
        res.status(500).json({ message: 'Failed to generate Surat Tugas', error: error.message });
    }
};

module.exports = { generate };