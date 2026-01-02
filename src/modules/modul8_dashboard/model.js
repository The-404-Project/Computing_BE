/**
 * Model Helper Functions
 * Utility functions for data normalization and formatting
 */

/**
 * Normalize metadata - ensure it's an object, not null, undefined, or string
 * @param {any} metadata - Metadata from database
 * @returns {object} - Normalized metadata object
 */
function normalizeMetadata(metadata) {
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch (e) {
      console.warn('Failed to parse metadata as JSON:', e);
      return {};
    }
  }
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return metadata;
}

/**
 * Format user object for response (exclude password_hash)
 * @param {object} user - User object from database
 * @returns {object} - Formatted user object
 */
function formatUser(user) {
  if (!user) return null;
  return {
    id: user.user_id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
  };
}

/**
 * Format document object for response
 * @param {object} doc - Document object from database
 * @param {object} creator - Creator user object (optional)
 * @returns {object} - Formatted document object
 */
function formatDocument(doc, creator = null) {
  const metadata = normalizeMetadata(doc.metadata);

  return {
    id: doc.id,
    doc_number: doc.doc_number,
    doc_type: doc.doc_type,
    status: doc.status,
    metadata: metadata,
    file_path: doc.file_path,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    created_by: creator ? formatUser(creator) : null,
  };
}

/**
 * Build where clause for document search/filter
 * @param {object} params - Search parameters
 * @param {string} params.search - Search term
 * @param {string} params.doc_type - Document type filter
 * @param {string} params.status - Status filter
 * @param {string} params.created_by - Creator filter
 * @param {string} params.date_from - Date from filter
 * @param {string} params.date_to - Date to filter
 * @returns {object} - Sequelize where clause
 */
function buildDocumentWhereClause(params) {
  const { Op } = require('sequelize');
  const { search = '', doc_type = '', status = '', created_by = '', date_from = '', date_to = '' } = params;

  const whereClause = {};

  if (search) {
    whereClause[Op.or] = [{ doc_number: { [Op.like]: `%${search}%` } }];
  }

  if (doc_type) {
    whereClause.doc_type = doc_type;
  }

  if (status) {
    whereClause.status = status;
  }

  if (created_by) {
    whereClause.created_by = parseInt(created_by);
  }

  if (date_from || date_to) {
    whereClause.created_at = {};
    if (date_from) {
      whereClause.created_at[Op.gte] = new Date(date_from);
    }
    if (date_to) {
      whereClause.created_at[Op.lte] = new Date(date_to + ' 23:59:59');
    }
  }

  return whereClause;
}

module.exports = {
  normalizeMetadata,
  formatUser,
  formatDocument,
  buildDocumentWhereClause,
};
