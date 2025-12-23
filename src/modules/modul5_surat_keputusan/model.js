const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/* =========================================================
   PATH SETUP & INITIALIZATION
   ========================================================= */
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'output');
const AUDIT_FILE = path.join(OUTPUT_DIR, 'modul5_audit_log.json');

// Ensure directories and files exist
const initializeStorage = () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

module.exports = {
  appendAuditLog
};
