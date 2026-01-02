const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    doc_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    doc_type: {
        type: DataTypes.STRING,
        // Value: 'surat_laak'
        allowNull: false 
    },
    status: {
        type: DataTypes.STRING, // 'draft', 'generated'
        defaultValue: 'draft'
    },
    metadata: {
        type: DataTypes.JSON, // Menyimpan kriteriaList, lampiranList, dll
        allowNull: true
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Document;