const fs = require('fs');
const path = require('path');
const { generateWordFile, generatePdfFile } = require('../../utils/doc_generator');

/* =========================================================
   PATH SETUP
   ========================================================= */
const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates', 'surat_templates');

if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

/* =========================================================
   DATA NORMALIZATION HELPERS
   ========================================================= */

/**
 * Formats a date string to Indonesian format.
 * @param {string} dateString - Date string (YYYY-MM-DD).
 * @returns {object} Formatted date parts.
 */
function formatDateIndo(dateString) {
  if (!dateString) return { full: '', hari: '', bulan: '', tahun: '' };
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { full: dateString, hari: '', bulan: '', tahun: '' };
    
    return {
      full: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d),
      hari: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d),
      bulan: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(d),
      tahun: d.getFullYear().toString(),
    };
  } catch (e) {
    return { full: dateString, hari: '', bulan: '', tahun: '' };
  }
}

/**
 * Formats row data for templates.
 * @param {Array} rows - Array of row objects.
 * @returns {Array} Formatted rows.
 */
function formatRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map(r => ({
    label: (r.label || '').trim(),
    content: (r.content || '').trim()
  }));
}

/**
 * Returns the label for a Pasal index (e.g., 0 -> "Pertama").
 * @param {number} idx - Index of the Pasal.
 * @returns {string} Label.
 */
function getPasalLabel(idx) {
  const labels = ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima', 'Keenam', 'Ketujuh', 'Kedelapan', 'Kesembilan', 'Kesepuluh'];
  return labels[idx] || `Ke-${idx + 1}`;
}

/**
 * Formats Pasal data.
 * @param {Array} pasalList - List of pasal objects.
 * @returns {Array} Formatted pasal list.
 */
function formatPasalList(pasalList) {
  if (!Array.isArray(pasalList)) return [];

  return pasalList.map((p, idx) => {
    const pasalLabel = getPasalLabel(idx);
    
    const baseItem = {
      label: pasalLabel,
      title: p.title || `Pasal ${idx + 1}`,
      content: p.content || '',
      type: p.type || 'text',
      points: []
    };

    if (p.type === 'points' && Array.isArray(p.points)) {
      baseItem.points = p.points.map(pt => ({
        label: pt.label || '',
        content: pt.content || ''
      }));
    }

    return baseItem;
  });
}

/**
 * Normalizes raw input data for template generation.
 * @param {object} data - Raw input data.
 * @returns {object} Normalized data.
 */
function normalizeData(data = {}) {
  const dateObj = formatDateIndo(data.tanggal_penetapan);

  const flatData = {
    nomor_surat: data.nomor_surat || '',
    perihal: data.perihal || '',
    tanggal_penetapan: data.tanggal_penetapan || '',
    tanggal_formatted: dateObj.full,
    hari: dateObj.hari,
    bulan: dateObj.bulan,
    tahun: dateObj.tahun,
    tempat: data.tempat || 'Bandung',
    approvers: Array.isArray(data.approvers)
      ? data.approvers.map(a => ({ role: a.role || '', name: a.name || '' }))
      : []
  };

  const menimbang_rows = formatRows(data.menimbang_rows);
  const mengingat_rows = formatRows(data.mengingat_rows);
  const memperhatikan_rows = formatRows(data.memperhatikan_rows);

  const memutuskanRaw = data.memutuskan || { pembuka: '', pasal: [] };
  const formattedPasal = formatPasalList(memutuskanRaw.pasal);

  return {
    ...flatData,
    
    // Top-level arrays (for legacy/simple loops)
    menimbang: menimbang_rows,
    menimbang_rows,
    mengingat: mengingat_rows,
    mengingat_rows,
    memperhatikan: memperhatikan_rows,
    memperhatikan_rows,
    
    memutuskan: {
      ...memutuskanRaw,
      pasal: formattedPasal
    },

    metadata: { ...flatData },

    // Structured content blocks
    content_blocks: {
      menimbang: menimbang_rows,
      mengingat: mengingat_rows,
      memperhatikan: memperhatikan_rows,
      memutuskan: {
        pembuka: memutuskanRaw.pembuka || '',
        pasal: formattedPasal
      }
    }
  };
}

/* =========================================================
   CORE SERVICES
   ========================================================= */

/**
 * Processes document generation (DOCX or PDF).
 * @param {object} payload - Request payload containing templateName and data.
 * @param {string} format - Output format ('docx' or 'pdf').
 * @param {boolean} isPreview - If true, adds a watermark to the PDF.
 * @returns {object} Result object with buffer, fileName, and mimeType.
 */
async function processSuratGeneration(payload, format = 'docx', isPreview = false) {
  const { templateName, data } = payload;
  const normalizedData = normalizeData(data);

  // 1. Generate DOCX Buffer
  const docxBuffer = generateWordFile(templateName, normalizedData);

  let finalBuffer = docxBuffer;
  let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  let ext = 'docx';

  // 2. Convert to PDF if requested
  if (format === 'pdf' || isPreview) {
    finalBuffer = await generatePdfFile(docxBuffer);
    mimeType = 'application/pdf';
    ext = 'pdf';

    // Tambahkan Watermark jika Preview
    if (isPreview) {
        const { addWatermarkToPdf } = require('../../utils/doc_generator');
        finalBuffer = await addWatermarkToPdf(finalBuffer);
    }
  }

  // 3. Generate Filename
  const cleanPerihal = (data.perihal || 'Dokumen').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Surat_${cleanPerihal}_${Date.now()}.${ext}`;

  return { buffer: finalBuffer, fileName, mimeType };
}

/**
 * Lists available templates.
 * @returns {Array} List of template filenames.
 */
function listTemplates() {
  if (!fs.existsSync(TEMPLATE_DIR)) return [];
  return fs.readdirSync(TEMPLATE_DIR).filter(f => f.endsWith('.docx'));
}

/**
 * Deletes a template by name.
 * @param {string} templateName - Name of the template to delete.
 * @returns {boolean} True if deleted, false otherwise.
 */
function deleteTemplate(templateName) {
  const p = path.join(TEMPLATE_DIR, templateName);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    return true;
  }
  return false;
}

/* =========================================================
   LEGACY / WRAPPER FUNCTIONS (Kept for compatibility)
   ========================================================= */

function generateDocxBuffer(templateName, rawData) {
  const data = normalizeData(rawData);
  return generateWordFile(templateName, data);
}

async function generatePdfBuffer(templateName, rawData) {
  const docxBuffer = generateDocxBuffer(templateName, rawData);
  return generatePdfFile(docxBuffer);
}

module.exports = {
  processSuratGeneration,
  generateDocxBuffer,
  generatePdfBuffer,
  listTemplates,
  deleteTemplate
};
