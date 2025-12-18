const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const { verifyPassword, generateToken } = require('../../utils/auth');

// Login (sudah ada)
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Username tidak ditemukan' });
    }
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }
    const token = generateToken(user);
    res.json({
      message: 'Login berhasil',
      token: token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// Get All Users (hanya admin)
const getAllUsers = async (req, res) => {
  try {
    // TODO: Tambahkan middleware auth check
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
    });

    // Map users to include id field
    const usersWithId = users.map((user) => ({
      id: user.user_id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
    }));

    res.json({ users: usersWithId });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data users' });
  }
};

// Get User by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({
      where: { user_id: parseInt(id) },
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    res.json({
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
};

// Create User (hanya admin)
const createUser = async (req, res) => {
  try {
    const { username, password, role, full_name, email } = req.body;

    // Validasi
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, dan role wajib diisi' });
    }

    // Cek username sudah ada
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      password_hash,
      role: role || 'staff',
      full_name: full_name || null,
      email: email || null,
    });

    res.status(201).json({
      message: 'User berhasil dibuat',
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ message: 'Gagal membuat user' });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, full_name, email } = req.body;

    console.log('Update User - ID:', id, 'Body:', { username, role, full_name, email, hasPassword: !!password });

    // Cari user berdasarkan user_id (primary key)
    const user = await User.findOne({ where: { user_id: parseInt(id) } });
    if (!user) {
      console.log('User not found with ID:', id);
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Validasi username jika diubah
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser && existingUser.user_id !== user.user_id) {
        return res.status(400).json({ message: 'Username sudah digunakan' });
      }
      user.username = username;
    }

    // Update fields
    if (role) user.role = role;
    if (full_name !== undefined) user.full_name = full_name || null;
    if (email !== undefined) user.email = email || null;

    // Update password jika ada dan tidak kosong
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password, salt);
    }

    await user.save();

    console.log('User updated successfully:', user.user_id);

    res.json({
      message: 'User berhasil diupdate',
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Update User Error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }
    res.status(500).json({ message: 'Gagal mengupdate user: ' + error.message });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Delete User - ID:', id);

    // Cari user berdasarkan user_id (primary key)
    const user = await User.findOne({ where: { user_id: parseInt(id) } });
    if (!user) {
      console.log('User not found with ID:', id);
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Jangan hapus user sendiri
    // TODO: Tambahkan check untuk mencegah hapus user yang sedang login

    await user.destroy();

    console.log('User deleted successfully:', id);

    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete User Error:', error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ message: 'User tidak dapat dihapus karena masih memiliki data terkait' });
    }
    res.status(500).json({ message: 'Gagal menghapus user: ' + error.message });
  }
};

// Search and Filter Documents
const searchDocuments = async (req, res) => {
  try {
    const Document = require('../../models/Document');
    const User = require('../../models/User');
    const { Op } = require('sequelize');

    // Get query parameters
    const { search = '', doc_type = '', status = '', created_by = '', date_from = '', date_to = '', page = 1, limit = 10 } = req.query;

    // Build where clause
    const whereClause = {};

    // Search in doc_number and metadata (using JSON search for metadata)
    if (search) {
      whereClause[Op.or] = [
        { doc_number: { [Op.like]: `%${search}%` } },
        // For JSON field, we'll search in doc_number for now
        // Full JSON search requires MySQL 5.7+ with JSON functions
      ];
    }

    // Filter by doc_type
    if (doc_type) {
      whereClause.doc_type = doc_type;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by created_by
    if (created_by) {
      whereClause.created_by = parseInt(created_by);
    }

    // Filter by date range
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) {
        whereClause.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        whereClause.created_at[Op.lte] = new Date(date_to + ' 23:59:59');
      }
    }

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get documents with pagination
    const { count, rows: documents } = await Document.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
    });

    // Get user info for each document
    const formattedDocuments = await Promise.all(
      documents.map(async (doc) => {
        let creator = null;
        if (doc.created_by) {
          const user = await User.findOne({ where: { user_id: doc.created_by } });
          if (user) {
            creator = {
              id: user.user_id,
              username: user.username,
              full_name: user.full_name,
              email: user.email,
            };
          }
        }

        return {
          id: doc.id,
          doc_number: doc.doc_number,
          doc_type: doc.doc_type,
          status: doc.status,
          metadata: doc.metadata,
          file_path: doc.file_path,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          created_by: creator,
        };
      })
    );

    res.json({
      documents: formattedDocuments,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Search Documents Error:', error);
    res.status(500).json({ message: 'Gagal mencari dokumen: ' + error.message });
  }
};

// Get Document Statistics
const getDocumentStats = async (req, res) => {
  try {
    const Document = require('../../models/Document');
    const { Op, fn, col, literal } = require('sequelize');
    const sequelize = require('../../config/database');

    // Get total documents
    const total = await Document.count();

    // Get documents by status
    const pending = await Document.count({
      where: { status: { [Op.in]: ['draft', 'pending'] } },
    });
    const completed = await Document.count({
      where: { status: { [Op.in]: ['approved', 'generated', 'sent'] } },
    });

    // Get documents by type
    const byTypeResult = await Document.findAll({
      attributes: ['doc_type', [fn('COUNT', col('id')), 'count']],
      group: ['doc_type'],
      raw: true,
    });

    const byType = byTypeResult.map((item) => ({
      type: item.doc_type || 'unknown',
      count: parseInt(item.count) || 0,
    }));

    // Get documents by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Use raw query for DATE_FORMAT in MySQL
    const byMonthResult = await sequelize.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count 
       FROM documents 
       WHERE created_at >= :sixMonthsAgo 
       GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
       ORDER BY month ASC`,
      {
        replacements: { sixMonthsAgo },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const byMonth = byMonthResult.map((item) => ({
      month: item.month,
      count: parseInt(item.count) || 0,
    }));

    res.json({
      total,
      pending,
      completed,
      byType,
      byMonth,
    });
  } catch (error) {
    console.error('Get Document Stats Error:', error);
    res.status(500).json({ message: 'Gagal mengambil statistik: ' + error.message });
  }
};

// Download Document by ID (Regenerate from metadata)
const downloadDocument = async (req, res) => {
  try {
    const Document = require('../../models/Document');
    const { id } = req.params;
    const { format = 'docx' } = req.query;

    // Get document from database
    const document = await Document.findOne({ where: { id: parseInt(id) } });
    if (!document) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    // Get metadata
    const metadata = document.metadata || {};
    const docType = document.doc_type;

    let result;

    // Regenerate document based on doc_type
    try {
      switch (docType) {
        case 'surat_tugas':
          const suratTugasService = require('../modul1_surat_tugas/service');
          const tugasData = {
            jenis_surat: metadata.jenis_surat || 'surat_tugas_dosen',
            nomorSurat: document.doc_number,
            namaPegawai: metadata.nama || metadata.namaPegawai,
            nip: metadata.nip,
            pangkat: metadata.pangkat,
            jabatan: metadata.jabatan,
            tujuanTugas: metadata.tujuan || metadata.tujuanTugas,
            keperluan: metadata.keperluan,
            tanggalMulai: metadata.tanggal_mulai || metadata.tanggalMulai,
            tanggalSelesai: metadata.tanggal_selesai || metadata.tanggalSelesai,
            biaya: metadata.biaya,
            kendaraan: metadata.kendaraan,
          };
          result = await suratTugasService.processSuratTugasGeneration(tugasData, format);
          break;

        case 'surat_undangan':
          const undanganService = require('../modul2_surat_undangan/service');
          const undanganData = {
            nomorSurat: document.doc_number,
            lampiran: metadata.lampiran,
            perihal: metadata.perihal,
            tanggalAcara: metadata.tanggal_acara || metadata.tanggalAcara,
            tempat: metadata.tempat,
            agenda: metadata.agenda,
            list_tamu: metadata.list_tamu_json || metadata.list_tamu || [],
            waktuMulai: metadata.waktu_mulai || metadata.waktuMulai,
            waktuAcara: metadata.waktu_acara || metadata.waktuAcara,
            waktuSelesai: metadata.waktu_selesai || metadata.waktuSelesai,
          };
          result = await undanganService.processSuratUndangan(undanganData, format);
          break;

        case 'surat_pengantar':
          const pengantarService = require('../modul4_surat_pengantar/service');
          const pengantarData = {
            jenis_surat: metadata.jenis_surat,
            metadata: metadata.metadata || metadata,
            content_blocks: metadata.content_blocks,
            dynamic_data: metadata.dynamic_data,
          };
          result = await pengantarService.processSuratGeneration(pengantarData, format);
          break;

        default:
          return res.status(400).json({ message: `Tipe dokumen ${docType} belum didukung untuk download` });
      }
    } catch (regenerateError) {
      console.error('Regenerate Error:', regenerateError);
      return res.status(500).json({ message: 'Gagal regenerate dokumen: ' + regenerateError.message });
    }

    // Send file
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename=${result.fileName}`,
      'Content-Length': result.buffer.length,
    });

    res.send(result.buffer);
  } catch (error) {
    console.error('Download Document Error:', error);
    res.status(500).json({ message: 'Gagal mengunduh dokumen: ' + error.message });
  }
};

// Export History to CSV
const exportHistory = async (req, res) => {
  try {
    const Document = require('../../models/Document');
    const User = require('../../models/User');
    const { Op } = require('sequelize');

    // Get query parameters (same as search)
    const { search = '', doc_type = '', status = '', date_from = '', date_to = '' } = req.query;

    // Build where clause (same as searchDocuments)
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

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) {
        whereClause.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        whereClause.created_at[Op.lte] = new Date(date_to + ' 23:59:59');
      }
    }

    // Get all documents (no pagination for export)
    const documents = await Document.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    // Get user info for each document
    const formattedDocuments = await Promise.all(
      documents.map(async (doc) => {
        let creator = null;
        if (doc.created_by) {
          const user = await User.findOne({ where: { user_id: doc.created_by } });
          if (user) {
            creator = user.full_name || user.username;
          }
        }

        return {
          nomor_surat: doc.doc_number,
          jenis_surat: doc.doc_type,
          status: doc.status,
          pembuat: creator || '-',
          tanggal_dibuat: doc.created_at.toISOString().split('T')[0],
          tanggal_diupdate: doc.updated_at.toISOString().split('T')[0],
        };
      })
    );

    // Generate CSV
    const csvHeaders = 'Nomor Surat,Jenis Surat,Status,Pembuat,Tanggal Dibuat,Tanggal Diupdate\n';
    const csvRows = formattedDocuments
      .map((doc) => {
        return `"${doc.nomor_surat}","${doc.jenis_surat}","${doc.status}","${doc.pembuat}","${doc.tanggal_dibuat}","${doc.tanggal_diupdate}"`;
      })
      .join('\n');

    const csvContent = csvHeaders + csvRows;

    // Set headers for CSV download
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
// TEMPLATE MANAGEMENT
// ============================================

// Get All Templates
const getAllTemplates = async (req, res) => {
  try {
    const Template = require('../../models/Template');
    const { template_type = '', is_active = '' } = req.query;

    const whereClause = {};
    if (template_type) {
      whereClause.template_type = template_type;
    }
    if (is_active !== '') {
      whereClause.is_active = is_active === 'true';
    }

    const templates = await Template.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    res.json({ templates });
  } catch (error) {
    console.error('Get Templates Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data templates' });
  }
};

// Get Template by ID
const getTemplateById = async (req, res) => {
  try {
    const Template = require('../../models/Template');
    const { id } = req.params;

    const template = await Template.findOne({ where: { template_id: parseInt(id) } });
    if (!template) {
      return res.status(404).json({ message: 'Template tidak ditemukan' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get Template Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data template' });
  }
};

// Create Template
const createTemplate = async (req, res) => {
  try {
    const Template = require('../../models/Template');
    const fs = require('fs');
    const path = require('path');

    const { template_name, template_type, description, variables, is_active = true } = req.body;

    // Validasi
    if (!template_name || !template_type) {
      return res.status(400).json({ message: 'Template name dan template type wajib diisi' });
    }

    // Handle file upload (if provided)
    let file_path = null;
    if (req.file) {
      const uploadDir = path.resolve(__dirname, '../../templates/surat_templates');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}_${req.file.originalname}`;
      file_path = path.join(uploadDir, fileName);
      fs.writeFileSync(file_path, req.file.buffer);

      // Update file_path to relative path
      file_path = `src/templates/surat_templates/${fileName}`;
    } else {
      return res.status(400).json({ message: 'File template wajib diupload' });
    }

    // Parse variables if string
    let variablesObj = variables;
    if (typeof variables === 'string') {
      try {
        variablesObj = JSON.parse(variables);
      } catch (e) {
        variablesObj = null;
      }
    }

    // Create template
    const template = await Template.create({
      template_name,
      template_type,
      file_path,
      variables: variablesObj,
      description: description || null,
      is_active: is_active === true || is_active === 'true',
    });

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
    res.status(500).json({ message: 'Gagal membuat template: ' + error.message });
  }
};

// Update Template
const updateTemplate = async (req, res) => {
  try {
    const Template = require('../../models/Template');
    const fs = require('fs');
    const path = require('path');

    const { id } = req.params;
    const { template_name, template_type, description, variables, is_active } = req.body;

    const template = await Template.findOne({ where: { template_id: parseInt(id) } });
    if (!template) {
      return res.status(404).json({ message: 'Template tidak ditemukan' });
    }

    // Update fields
    if (template_name) template.template_name = template_name;
    if (template_type) template.template_type = template_type;
    if (description !== undefined) template.description = description || null;
    if (is_active !== undefined) template.is_active = is_active === true || is_active === 'true';

    // Parse variables if string
    if (variables !== undefined) {
      if (typeof variables === 'string') {
        try {
          template.variables = JSON.parse(variables);
        } catch (e) {
          template.variables = null;
        }
      } else {
        template.variables = variables;
      }
    }

    // Handle file upload (if provided)
    if (req.file) {
      // Delete old file if exists
      if (template.file_path) {
        const oldFilePath = path.resolve(__dirname, '../../', template.file_path);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (e) {
            console.warn('Failed to delete old file:', e);
          }
        }
      }

      // Save new file
      const uploadDir = path.resolve(__dirname, '../../templates/surat_templates');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}_${req.file.originalname}`;
      const newFilePath = path.join(uploadDir, fileName);
      fs.writeFileSync(newFilePath, req.file.buffer);

      template.file_path = `src/templates/surat_templates/${fileName}`;
    }

    await template.save();

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
    res.status(500).json({ message: 'Gagal mengupdate template: ' + error.message });
  }
};

// Delete Template
const deleteTemplate = async (req, res) => {
  try {
    const Template = require('../../models/Template');
    const fs = require('fs');
    const path = require('path');

    const { id } = req.params;

    const template = await Template.findOne({ where: { template_id: parseInt(id) } });
    if (!template) {
      return res.status(404).json({ message: 'Template tidak ditemukan' });
    }

    // Delete file if exists
    if (template.file_path) {
      const filePath = path.resolve(__dirname, '../../', template.file_path);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Failed to delete template file:', e);
        }
      }
    }

    await template.destroy();

    res.json({ message: 'Template berhasil dihapus' });
  } catch (error) {
    console.error('Delete Template Error:', error);
    res.status(500).json({ message: 'Gagal menghapus template: ' + error.message });
  }
};

// Toggle Template Active Status
const toggleTemplateActive = async (req, res) => {
  try {
    const Template = require('../../models/Template');
    const { id } = req.params;

    const template = await Template.findOne({ where: { template_id: parseInt(id) } });
    if (!template) {
      return res.status(404).json({ message: 'Template tidak ditemukan' });
    }

    template.is_active = !template.is_active;
    await template.save();

    res.json({
      message: `Template berhasil ${template.is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
      template: {
        template_id: template.template_id,
        template_name: template.template_name,
        is_active: template.is_active,
      },
    });
  } catch (error) {
    console.error('Toggle Template Active Error:', error);
    res.status(500).json({ message: 'Gagal mengubah status template: ' + error.message });
  }
};

// Preview/Download Template File
const previewTemplate = async (req, res) => {
  try {
    const Template = require('../../models/Template');
    const fs = require('fs');
    const path = require('path');

    const { id } = req.params;

    const template = await Template.findOne({ where: { template_id: parseInt(id) } });
    if (!template) {
      return res.status(404).json({ message: 'Template tidak ditemukan' });
    }

    // Get file path
    const filePath = path.resolve(__dirname, '../../', template.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File template tidak ditemukan' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(template.file_path);

    // Set headers for file download
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileBuffer.length,
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error('Preview Template Error:', error);
    res.status(500).json({ message: 'Gagal mengambil file template: ' + error.message });
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
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
  previewTemplate,
};
