const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
    doc_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    doc_number: { type: DataTypes.STRING(50) },
    status: { type: DataTypes.ENUM('draft', 'approved', 'sent'), defaultValue: 'draft' },
    metadata: { type: DataTypes.JSON },
    created_by: { type: DataTypes.INTEGER }, // Foreign Key ke User
    file_path: { type: DataTypes.STRING(255) }
}, { tableName: 'documents', createdAt: 'created_at', updatedAt: false });

module.exports = Document;