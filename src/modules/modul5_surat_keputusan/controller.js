const path = require('path');
const fs = require('fs');
const service = require('./service');
const model = require('./model');

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
    const { templateName, data, saveVersionName } = req.body;

    if (!templateName || !data) {
      return sendError(res, 400, 'templateName and data are required');
    }

    const result = await service.processSuratGeneration(req.body, 'docx');

    if (saveVersionName) {
      await model.saveVersion(
        saveVersionName,
        {
          templateName,
          data,
          user: req.user?.name
        },
        result.buffer
      );
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
    const { templateName, data } = req.body;

    if (!templateName || !data) {
      return sendError(res, 400, 'templateName and data are required');
    }

    const result = await service.processSuratGeneration(req.body, 'pdf');

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);

    return res.send(result.buffer);
  } catch (error) {
    return sendError(res, 500, 'Failed to generate PDF', error);
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

/**
 * List saved document versions
 */
async function listVersions(req, res) {
  try {
    const filters = {
      creator: req.query.creator,
      date: req.query.date,
      type: req.query.type,
      search: req.query.search
    };
    const versions = await model.listVersions(filters);
    return res.json({ versions });
  } catch (error) {
    return sendError(res, 500, 'Failed to list versions', error);
  }
}

/**
 * Download a specific version file
 */
async function downloadVersion(req, res) {
  try {
    const { id } = req.params;
    const buffer = model.getVersionFile(id);

    if (!buffer) {
      return sendError(res, 404, 'Version not found');
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Surat_Version_${id}.docx`
    );

    return res.send(buffer);
  } catch (error) {
    return sendError(res, 500, 'Failed to download version', error);
  }
}

module.exports = {
  uploadTemplate,
  deleteTemplate,
  generateDocx,
  generatePdf,
  listTemplates,
  listVersions,
  downloadVersion,
};
