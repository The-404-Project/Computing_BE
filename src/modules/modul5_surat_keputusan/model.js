const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/* =========================================================
   PATH SETUP & INITIALIZATION
   ========================================================= */
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'output');
const VERSION_DIR = path.join(OUTPUT_DIR, 'versions');
const VERSIONS_FILE = path.join(OUTPUT_DIR, 'modul5_versions.json');
const AUDIT_FILE = path.join(OUTPUT_DIR, 'modul5_audit_log.json');

// Ensure directories and files exist
const initializeStorage = () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(VERSION_DIR)) fs.mkdirSync(VERSION_DIR, { recursive: true });
  if (!fs.existsSync(VERSIONS_FILE)) fs.writeFileSync(VERSIONS_FILE, JSON.stringify([]));
  if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, JSON.stringify([]));
};

initializeStorage();

/* =========================================================
   INTERNAL HELPERS
   ========================================================= */

/**
 * Reads and parses a JSON file safely.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Array} - Parsed data or empty array on failure.
 */
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

/**
 * Writes data to a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @param {any} data - Data to write.
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}

/* =========================================================
   AUDIT LOGGING
   ========================================================= */

/**
 * Reads the audit log.
 * @returns {Array} List of audit logs.
 */
function readAuditLog() {
  return readJsonFile(AUDIT_FILE);
}

/**
 * Appends a new entry to the audit log.
 * @param {string} action - Action name (e.g., 'UPLOAD_TEMPLATE').
 * @param {object} details - Additional details about the action.
 * @param {string} user - User performing the action (default: 'system').
 */
function appendAuditLog(action, details, user = 'system') {
  const logs = readAuditLog();
  logs.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    user,
    details
  });
  writeJsonFile(AUDIT_FILE, logs);
}

/* =========================================================
   VERSION MANAGEMENT
   ========================================================= */

/**
 * Reads all versions.
 * @returns {Array} List of versions.
 */
function readVersions() {
  return readJsonFile(VERSIONS_FILE);
}

/**
 * Save document version
 * @param {string} name - version name (ex: v1.0-draft)
 * @param {object} meta - metadata (templateName, data, user)
 * @param {Buffer} docxBuffer - generated docx
 * @returns {object} The saved version entry.
 */
async function saveVersion(name, meta = {}, docxBuffer) {
  const versions = readVersions();
  const id = uuidv4();
  const filename = `modul5_${id}.docx`;
  const filepath = path.join(VERSION_DIR, filename);

  if (docxBuffer) {
    fs.writeFileSync(filepath, docxBuffer);
  }

  const entry = {
    id,
    name: name || 'unnamed-version',
    createdAt: new Date().toISOString(),
    createdBy: meta.user || 'anonymous', // FR-12: Pembuat
    templateName: meta.templateName || null,
    document: {
      perihal: meta.data?.perihal || '',
      nomor_surat: meta.data?.nomor_surat || '',
      tanggal_penetapan: meta.data?.tanggal_penetapan || '',
      menimbang: meta.data?.menimbang || [],
      mengingat: meta.data?.mengingat || [],
      memperhatikan: meta.data?.memperhatikan || [],
      memutuskan: meta.data?.memutuskan || [],
      approvers: meta.data?.approvers || [],
    },
    file: {
      filename,
      path: filepath,
      size: docxBuffer ? docxBuffer.length : 0,
    },
    status: 'DRAFT',
  };

  versions.push(entry);
  writeJsonFile(VERSIONS_FILE, versions);
  
  appendAuditLog('SAVE_VERSION', { versionId: id, name }, meta.user);

  return entry;
}

/**
 * List all saved versions with Filter & Search (FR-13, FR-14)
 * @param {object} filters - Filter criteria (creator, date, type, search).
 * @returns {Array} Filtered list of versions.
 */
function listVersions(filters = {}) {
  let versions = readVersions();

  if (filters.creator) {
    versions = versions.filter(v => v.createdBy === filters.creator);
  }

  if (filters.date) {
    versions = versions.filter(v => v.createdAt.startsWith(filters.date));
  }

  if (filters.type) {
    versions = versions.filter(v => v.templateName && v.templateName.includes(filters.type));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    versions = versions.filter(v => 
      v.name.toLowerCase().includes(q) ||
      (v.document.perihal && v.document.perihal.toLowerCase().includes(q)) ||
      (v.document.nomor_surat && v.document.nomor_surat.toLowerCase().includes(q))
    );
  }

  return versions;
}

/**
 * Get version by ID
 * @param {string} id - Version ID.
 * @returns {object|undefined} Version object or undefined.
 */
function getVersionById(id) {
  const versions = readVersions();
  return versions.find((v) => v.id === id);
}

/**
 * Get DOCX buffer by version ID
 * @param {string} id - Version ID.
 * @returns {Buffer|null} File buffer or null if not found.
 */
function getVersionFile(id) {
  const version = getVersionById(id);
  if (!version) return null;

  const filePath = version.file?.path;
  if (!filePath || !fs.existsSync(filePath)) return null;
  
  // Log access (FR-17)
  appendAuditLog('DOWNLOAD_VERSION', { versionId: id }, 'system'); 

  return fs.readFileSync(filePath);
}

module.exports = {
  saveVersion,
  listVersions,
  getVersionById,
  getVersionFile,
  appendAuditLog
};
