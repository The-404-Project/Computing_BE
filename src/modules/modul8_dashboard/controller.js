/**
 * Controller Layer - HTTP Request/Response Handler
 * Only handles HTTP requests and responses, delegates business logic to service layer
 */

const service = require('./service');

// ============================================
// USER CONTROLLERS
// ============================================

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await service.loginService(username, password);
    res.json({
      message: 'Login berhasil',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error('Login Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') || error.message.includes('salah') ? 401 : 500;
    res.status(statusCode).json({ message: error.message || 'Terjadi kesalahan server' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await service.getAllUsersService();
    res.json({ users });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data users' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await service.getUserByIdService(id);
    res.json({ user });
  } catch (error) {
    console.error('Get User Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal mengambil data user' });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, password, role, full_name, email } = req.body;
    const user = await service.createUserService({ username, password, role, full_name, email });
    res.status(201).json({
      message: 'User berhasil dibuat',
      user,
    });
  } catch (error) {
    console.error('Create User Error:', error);
    const statusCode = error.message.includes('wajib') || error.message.includes('sudah digunakan') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal membuat user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, full_name, email } = req.body;
    const user = await service.updateUserService(id, { username, password, role, full_name, email });
    res.json({
      message: 'User berhasil diupdate',
      user,
    });
  } catch (error) {
    console.error('Update User Error:', error);
    let statusCode = 500;
    if (error.message.includes('tidak ditemukan')) statusCode = 404;
    else if (error.message.includes('sudah digunakan')) statusCode = 400;

    res.status(statusCode).json({ message: error.message || 'Gagal mengupdate user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await service.deleteUserService(id);
    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete User Error:', error);
    let statusCode = 500;
    if (error.message.includes('tidak ditemukan')) statusCode = 404;
    else if (error.name === 'SequelizeForeignKeyConstraintError') statusCode = 400;

    const message = error.name === 'SequelizeForeignKeyConstraintError' ? 'User tidak dapat dihapus karena masih memiliki data terkait' : error.message || 'Gagal menghapus user';

    res.status(statusCode).json({ message });
  }
};

// ============================================
// DOCUMENT CONTROLLERS
// ============================================

const searchDocuments = async (req, res) => {
  try {
    const { search, doc_type, status, created_by, date_from, date_to, page, limit } = req.query;
    const result = await service.searchDocumentsService({
      search,
      doc_type,
      status,
      created_by,
      date_from,
      date_to,
      page,
      limit,
    });
    res.json(result);
  } catch (error) {
    console.error('Search Documents Error:', error);
    res.status(500).json({ message: 'Gagal mencari dokumen: ' + error.message });
  }
};

const getDocumentStats = async (req, res) => {
  try {
    const stats = await service.getDocumentStatsService();
    res.json(stats);
  } catch (error) {
    console.error('Get Document Stats Error:', error);
    res.status(500).json({ message: 'Gagal mengambil statistik: ' + error.message });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'docx' } = req.query;
    const result = await service.downloadDocumentService(id, format);

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename=${result.fileName}`,
      'Content-Length': result.buffer.length,
    });

    res.send(result.buffer);
  } catch (error) {
    console.error('Download Document Error:', error);
    let statusCode = 500;
    if (error.message.includes('tidak ditemukan')) statusCode = 404;
    else if (error.message.includes('tidak lengkap') || error.message.includes('belum didukung')) statusCode = 400;

    res.status(statusCode).json({
      message: error.message || 'Gagal mengunduh dokumen',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

const exportHistory = async (req, res) => {
  try {
    const { search, doc_type, status, date_from, date_to } = req.query;
    const csvContent = await service.exportHistoryService({
      search,
      doc_type,
      status,
      date_from,
      date_to,
    });

    const fileName = `arsip_surat_${new Date().toISOString().split('T')[0]}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${fileName}`,
    });

    // Add BOM for Excel compatibility
    res.send('\ufeff' + csvContent);
  } catch (error) {
    console.error('Export History Error:', error);
    res.status(500).json({ message: 'Gagal mengekspor history: ' + error.message });
  }
};

// ============================================
// TEMPLATE CONTROLLERS
// ============================================

const getAllTemplates = async (req, res) => {
  try {
    const { template_type, is_active } = req.query;
    const templates = await service.getAllTemplatesService({ template_type, is_active });
    res.json({ templates });
  } catch (error) {
    console.error('Get Templates Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data templates' });
  }
};

const getTemplatesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const templates = await service.getTemplatesByTypeService(type);
    res.json({ templates });
  } catch (error) {
    console.error('Get Templates By Type Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data templates: ' + error.message });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await service.getTemplateByIdService(id);
    res.json({ template });
  } catch (error) {
    console.error('Get Template Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal mengambil data template' });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { template_name, template_type, description, is_active } = req.body;
    const fileBuffer = req.file ? req.file.buffer : null;
    const originalName = req.file ? req.file.originalname : null;

    const template = await service.createTemplateService({ template_name, template_type, description, is_active }, fileBuffer, originalName);

    res.status(201).json({
      message: 'Template berhasil dibuat',
      template: {
        template_id: template.template_id,
        template_name: template.template_name,
        template_type: template.template_type,
        file_path: template.file_path,
        variables: template.variables,
        description: template.description,
        is_active: template.is_active,
      },
    });
  } catch (error) {
    console.error('Create Template Error:', error);
    const statusCode = error.message.includes('wajib') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal membuat template' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { template_name, template_type, description, variables, is_active } = req.body;
    const fileBuffer = req.file ? req.file.buffer : null;
    const originalName = req.file ? req.file.originalname : null;

    const template = await service.updateTemplateService(id, { template_name, template_type, description, variables, is_active }, fileBuffer, originalName);

    res.json({
      message: 'Template berhasil diupdate',
      template: {
        template_id: template.template_id,
        template_name: template.template_name,
        template_type: template.template_type,
        file_path: template.file_path,
        variables: template.variables,
        description: template.description,
        is_active: template.is_active,
      },
    });
  } catch (error) {
    console.error('Update Template Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal mengupdate template' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await service.deleteTemplateService(id);
    res.json({ message: 'Template berhasil dihapus' });
  } catch (error) {
    console.error('Delete Template Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal menghapus template' });
  }
};

const toggleTemplateActive = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.toggleTemplateActiveService(id);
    res.json({
      message: `Template berhasil ${result.is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
      template: result,
    });
  } catch (error) {
    console.error('Toggle Template Active Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal mengubah status template' });
  }
};

const previewTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.getTemplateFileService(id);

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Content-Length': result.buffer.length,
    });

    res.send(result.buffer);
  } catch (error) {
    console.error('Preview Template Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Gagal mengambil file template' });
  }
};

const downloadTemplateFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await service.getTemplateFileByNameService(filename);

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    });

    res.send(result.buffer);
  } catch (error) {
    console.error('[Download Template] Error:', error);
    const statusCode = error.message.includes('tidak ditemukan') || error.message.includes('Invalid') ? (error.message.includes('Invalid') ? 400 : 404) : 500;

    if (!res.headersSent) {
      res.status(statusCode).json({ message: error.message || 'Gagal mengunduh template' });
    }
  }
};

module.exports = {
  login,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  searchDocuments,
  getDocumentStats,
  downloadDocument,
  exportHistory,
  getAllTemplates,
  getTemplatesByType,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
  previewTemplate,
  downloadTemplateFile,
};
