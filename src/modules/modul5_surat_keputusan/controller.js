const path = require('path');
const fs = require('fs');
const service = require('./service');
const model = require('./model');
const Document = require('../../models/Document');

const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates', 'surat_templates');

/* =========================================================
   Helper Functions
   ========================================================= */

/**
 * Sends a standard error response
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {object} error - Error object (optional)
 */
const sendError = (res, status, message, error = null) => {
  if (error) {
    console.error(`[ERROR] ${message}:`, error);
  }
  return res.status(status).json({ message });
};

/**
 * Map docType to jenis_surat for display in archive
 * @param {string} docType - Document type from frontend (e.g., 'SE_AKADEMIK', 'SK_DEKAN')
 * @returns {string|null} - Normalized jenis_surat or null
 */
const getJenisSuratFromDocType = (docType) => {
  if (!docType) return null;
  
  const jenisSuratMap = {
    'SK_DEKAN': 'sk_dekan',
    'SK_PANITIA': 'sk_panitia',
    'SE_AKADEMIK': 'se_akademik',
    'SE_UMUM': 'se_umum',
  };
  
  return jenisSuratMap[docType] || null;
};

/* =========================================================
   Controller Functions
   ========================================================= */

/**
 * Upload a DOCX template
 */
async function uploadTemplate(req, res) {
  try {
    if (!req.files || !req.files.template) {
      return sendError(res, 400, 'Template file is required');
    }

    const file = req.files.template;
    const ext = path.extname(file.name);

    if (ext !== '.docx') {
      return sendError(res, 400, 'Only .docx templates allowed');
    }

    if (!fs.existsSync(TEMPLATE_DIR)) {
      fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
    }

    const savePath = path.join(TEMPLATE_DIR, file.name);
    await file.mv(savePath);

    // Audit Log
    model.appendAuditLog('UPLOAD_TEMPLATE', { templateName: file.name }, req.user?.name);

    return res.json({
      success: true,
      templateName: file.name,
    });
  } catch (error) {
    return sendError(res, 500, 'Failed to upload template', error);
  }
}

/**
 * Delete a template
 */
async function deleteTemplate(req, res) {
  try {
    const { templateName } = req.body;
    if (!templateName) {
      return sendError(res, 400, 'templateName is required');
    }

    const success = service.deleteTemplate(templateName);
    if (success) {
      model.appendAuditLog('DELETE_TEMPLATE', { templateName }, req.user?.name);
      return res.json({ success: true, message: 'Template deleted' });
    } else {
      return sendError(res, 404, 'Template not found');
    }
  } catch (error) {
    return sendError(res, 500, 'Failed to delete template', error);
  }
}

/**
 * Generate DOCX file for download
 */
async function generateDocx(req, res) {
  try {
    const { templateName, data, docType } = req.body;

    if (!templateName || !data) {
      return sendError(res, 400, 'templateName and data are required');
    }

    const result = await service.processSuratGeneration(req.body, 'docx');

    // Simpan ke database
    try {
      const user_id = req.user ? req.user.user_id : 1;
      
      // Tentukan doc_type berdasarkan templateName atau docType
      let documentType = 'surat_keputusan'; // default
      if (templateName && templateName.includes('edaran')) {
        documentType = 'surat_edaran';
      } else if (docType) {
        // Jika docType dari frontend, gunakan untuk menentukan
        if (docType.startsWith('SE_')) {
          documentType = 'surat_edaran';
        } else if (docType.startsWith('SK_')) {
          documentType = 'surat_keputusan';
        }
      }

      // Simpan file ke disk jika belum ada
      const outputDir = path.resolve(__dirname, '../../../output/generated_documents');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, result.fileName);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, result.buffer);
      }

      await Document.create({
        doc_number: data.nomor_surat || `SK-${Date.now()}`,
        doc_type: documentType,
        status: 'generated',
        created_by: user_id,
        file_path: result.fileName,
        metadata: {
          templateName,
          docType: docType || null,
          perihal: data.perihal || '',
          nomor_surat: data.nomor_surat || '',
          tempat: data.tempat || '',
          tanggal_penetapan: data.tanggal_penetapan || '',
          menimbang_rows: data.menimbang_rows || [],
          mengingat_rows: data.mengingat_rows || [],
          memperhatikan_rows: data.memperhatikan_rows || [],
          memutuskan: data.memutuskan || {},
          approvers: data.approvers || [],
          generated_filename: result.fileName,
        },
      });
      console.log(`[Modul 5] Document saved to database: ${data.nomor_surat || 'AUTO'}`);
    } catch (dbError) {
      console.error('[Modul 5] Error saving to database:', dbError);
      // Jangan gagal request jika database error, tetap kirim file
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);

    return res.send(result.buffer);
  } catch (error) {
    return sendError(res, 500, 'Failed to generate DOCX', error);
  }
}

/**
 * Generate PDF file for download
 */
async function generatePdf(req, res) {
  try {
    const { templateName, data, docType } = req.body;

    if (!templateName || !data) {
      return sendError(res, 400, 'templateName and data are required');
    }

    const result = await service.processSuratGeneration(req.body, 'pdf');

    // Simpan ke database
    try {
      const user_id = req.user ? req.user.user_id : 1;
      
      // Tentukan doc_type berdasarkan templateName atau docType
      let documentType = 'surat_keputusan'; // default
      if (templateName && templateName.includes('edaran')) {
        documentType = 'surat_edaran';
      } else if (docType) {
        // Jika docType dari frontend, gunakan untuk menentukan
        if (docType.startsWith('SE_')) {
          documentType = 'surat_edaran';
        } else if (docType.startsWith('SK_')) {
          documentType = 'surat_keputusan';
        }
      }

      // Simpan file ke disk jika belum ada
      const outputDir = path.resolve(__dirname, '../../../output/generated_documents');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, result.fileName);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, result.buffer);
      }

      // Tentukan jenis_surat spesifik dari docType untuk display di arsip
      const jenisSurat = getJenisSuratFromDocType(docType);

      await Document.create({
        doc_number: data.nomor_surat || `SK-${Date.now()}`,
        doc_type: documentType,
        status: 'generated',
        created_by: user_id,
        file_path: result.fileName,
        metadata: {
          templateName,
          docType: docType || null,
          jenis_surat: jenisSurat, // Simpan jenis_surat spesifik untuk display di arsip
          perihal: data.perihal || '',
          nomor_surat: data.nomor_surat || '',
          tempat: data.tempat || '',
          tanggal_penetapan: data.tanggal_penetapan || '',
          menimbang_rows: data.menimbang_rows || [],
          mengingat_rows: data.mengingat_rows || [],
          memperhatikan_rows: data.memperhatikan_rows || [],
          memutuskan: data.memutuskan || {},
          approvers: data.approvers || [],
          generated_filename: result.fileName,
        },
      });
      console.log(`[Modul 5] Document saved to database: ${data.nomor_surat || 'AUTO'}, Jenis: ${jenisSurat || docType || 'N/A'}`);
    } catch (dbError) {
      console.error('[Modul 5] Error saving to database:', dbError);
      // Jangan gagal request jika database error, tetap kirim file
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);

    return res.send(result.buffer);
  } catch (error) {
    return sendError(res, 500, 'Failed to generate PDF', error);
  }
}

/**
 * Generate Preview (PDF with Watermark)
 */
async function generatePreview(req, res) {
  try {
    const { templateName, data } = req.body;

    if (!templateName || !data) {
      return sendError(res, 400, 'templateName and data are required');
    }

    // Panggil service dengan flag isPreview = true
    const result = await service.processSuratGeneration(req.body, 'pdf', true);

    res.setHeader('Content-Type', 'application/pdf');
    // Inline agar browser membuka di tab/iframe, bukan download
    res.setHeader('Content-Disposition', 'inline; filename=preview.pdf');

    return res.send(result.buffer);
  } catch (error) {
    return sendError(res, 500, 'Failed to generate preview', error);
  }
}

/**
 * List available templates
 */
async function listTemplates(req, res) {
  try {
    const templates = await service.listTemplates();
    return res.json({ templates });
  } catch (error) {
    return sendError(res, 500, 'Failed to list templates', error);
  }
}

module.exports = {
  uploadTemplate,
  deleteTemplate,
  generateDocx,
  generatePdf,
  generatePreview,
  listTemplates,
};
