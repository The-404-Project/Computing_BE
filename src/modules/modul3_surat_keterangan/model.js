const { DataTypes } = require('sequelize')

function initModels(sequelize) {
  const Mahasiswa = sequelize.define(
    'mahasiswa',
    {
      nim: { type: DataTypes.STRING(20), primaryKey: true },
      nama: { type: DataTypes.STRING(100), allowNull: false },
      prodi: { type: DataTypes.STRING(50), allowNull: false },
      angkatan: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM('aktif', 'cuti', 'lulus', 'keluar'),
        allowNull: false,
      },
      email: { type: DataTypes.STRING(100) },
    },
    {
      tableName: 'mahasiswa',
      timestamps: false,
    }
  )

  const User = sequelize.define(
    'users',
    {
      user_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      full_name: { type: DataTypes.STRING(100) },
      email: { type: DataTypes.STRING(100) },
      role: { type: DataTypes.ENUM('admin', 'staff', 'kaprodi', 'dekan') },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: 'users', timestamps: false }
  )

  const Template = sequelize.define(
    'templates',
    {
      template_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      template_name: { type: DataTypes.STRING(100) },
      template_type: { type: DataTypes.STRING(50) },
      file_content: { type: DataTypes.BLOB('long') },
      variables: { type: DataTypes.JSON },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: 'templates', timestamps: false }
  )

  const Document = sequelize.define(
    'documents',
    {
      doc_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      doc_number: { type: DataTypes.STRING(50), unique: true },
      doc_type: { type: DataTypes.STRING(50) },
      template_id: { type: DataTypes.INTEGER.UNSIGNED },
      created_by: { type: DataTypes.INTEGER.UNSIGNED },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      status: { type: DataTypes.ENUM('draft', 'approved', 'sent'), defaultValue: 'sent' },
      file_path: { type: DataTypes.STRING(255) },
      metadata: { type: DataTypes.JSON },
    },
    { tableName: 'documents', timestamps: false }
  )

  Document.belongsTo(User, { foreignKey: 'created_by', targetKey: 'user_id' })
  Document.belongsTo(Template, { foreignKey: 'template_id', targetKey: 'template_id' })

  return { Mahasiswa, User, Template, Document }
}

module.exports = { initModels }
