/**
 * Service Layer - Business Logic
 * Contains all business logic separated from HTTP handling
 */

const User = require('../../models/User');
const Document = require('../../models/Document');
const Template = require('../../models/Template');
const bcrypt = require('bcryptjs');
const { verifyPassword, generateToken } = require('../../utils/auth');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../../config/database');
const { normalizeMetadata, formatUser, formatDocument, buildDocumentWhereClause } = require('./model');

// ============================================
// USER SERVICES
// ============================================

/**
 * Login service
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<object>} - Login result with token and user info
 */
async function loginService(username, password) {
  const user = await User.findOne({ where: { username } });
  if (!user) {
    throw new Error('Username tidak ditemukan');
  }

  const isMatch = await verifyPassword(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Password salah');
  }

  const token = generateToken(user);
  return {
    token,
    user: {
      id: user.user_id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
    },
  };
}

/**
 * Get all users
 * @returns {Promise<Array>} - List of users
 */
async function getAllUsersService() {
  const users = await User.findAll({
    attributes: { exclude: ['password_hash'] },
    order: [['created_at', 'DESC']],
  });

  return users.map(formatUser);
}

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<object>} - User object
 */
async function getUserByIdService(id) {
  const user = await User.findOne({
    where: { user_id: parseInt(id) },
    attributes: { exclude: ['password_hash'] },
  });

  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  return formatUser(user);
}

/**
 * Create user
 * @param {object} userData - User data
 * @returns {Promise<object>} - Created user
 */
async function createUserService(userData) {
  const { username, password, role, full_name, email } = userData;

  if (!username || !password || !role) {
    throw new Error('Username, password, dan role wajib diisi');
  }

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    throw new Error('Username sudah digunakan');
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    password_hash,
    role: role || 'staff',
    full_name: full_name || null,
    email: email || null,
  });

  return formatUser(user);
}

/**
 * Update user
 * @param {number} id - User ID
 * @param {object} userData - User data to update
 * @returns {Promise<object>} - Updated user
 */
async function updateUserService(id, userData) {
  const { username, password, role, full_name, email } = userData;

  const user = await User.findOne({ where: { user_id: parseInt(id) } });
  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  if (username && username !== user.username) {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser && existingUser.user_id !== user.user_id) {
      throw new Error('Username sudah digunakan');
    }
    user.username = username;
  }

  if (role) user.role = role;
  if (full_name !== undefined) user.full_name = full_name || null;
  if (email !== undefined) user.email = email || null;

  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
  }

  await user.save();
  return formatUser(user);
}

/**
 * Delete user
 * @param {number} id - User ID
 * @returns {Promise<void>}
 */
async function deleteUserService(id) {
  const user = await User.findOne({ where: { user_id: parseInt(id) } });
  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  await user.destroy();
}

// ============================================
// DOCUMENT SERVICES
// ============================================

/**
 * Search and filter documents
 * @param {object} params - Search parameters
 * @returns {Promise<object>} - Documents with pagination
 */
async function searchDocumentsService(params) {
  const { page = 1, limit = 10 } = params;
  const whereClause = buildDocumentWhereClause(params);
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { count, rows: documents } = await Document.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset,
  });

  const formattedDocuments = await Promise.all(
    documents.map(async (doc) => {
      let creator = null;
      if (doc.created_by) {
        const user = await User.findOne({ where: { user_id: doc.created_by } });
        if (user) {
          creator = user;
        }
      }
      return formatDocument(doc, creator);
    })
  );

  return {
    documents: formattedDocuments,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
    },
  };
}

/**
 * Get document statistics
 * @returns {Promise<object>} - Document statistics
 */
async function getDocumentStatsService() {
  const total = await Document.count();

  const pending = await Document.count({
    where: { status: { [Op.in]: ['draft', 'pending'] } },
  });

  const completed = await Document.count({
    where: { status: { [Op.in]: ['approved', 'generated', 'sent'] } },
  });

  const byTypeResult = await Document.findAll({
    attributes: ['doc_type', [fn('COUNT', col('id')), 'count']],
    group: ['doc_type'],
    raw: true,
  });

  const byType = byTypeResult.map((item) => ({
    type: item.doc_type || 'unknown',
    count: parseInt(item.count) || 0,
  }));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

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

  return {
    total,
    pending,
    completed,
    byType,
    byMonth,
  };
}

/**
 * Download/regenerate document
 * @param {number} id - Document ID
 * @param {string} format - Output format (docx/pdf)
 * @returns {Promise<object>} - File buffer and metadata
 */
async function downloadDocumentService(id, format = 'docx') {
  const document = await Document.findOne({ where: { id: parseInt(id) } });
  if (!document) {
    throw new Error('Dokumen tidak ditemukan');
  }

  let metadata = normalizeMetadata(document.metadata);
  const docType = document.doc_type;

  console.log(`[Download] Document ID: ${id}, Type: ${docType}, Metadata:`, JSON.stringify(metadata));

  let result;

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

    case 'surat_keterangan':
      const keteranganService = require('../modul3_surat_keterangan/service');
      const fs = require('fs');
      const path = require('path');

      // Check if file exists on disk (for compatibility with old documents)
      if (document.file_path && format === 'docx') {
        let fileName = document.file_path;
        if (!fileName.includes('/') && !fileName.includes('\\')) {
          fileName = document.file_path;
        }

        const filePath = path.join(__dirname, '../../../output/generated_documents', fileName);
        console.log('[Download] Surat Keterangan: Mencoba file dari disk:', filePath);
        console.log('[Download] Surat Keterangan: File exists?', fs.existsSync(filePath));

        if (fs.existsSync(filePath)) {
          try {
            console.log('[Download] Surat Keterangan: File ditemukan di disk, mengirim langsung');
            const fileBuffer = fs.readFileSync(filePath);
            const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            return {
              buffer: fileBuffer,
              fileName: fileName,
              mimeType: mimeType,
            };
          } catch (fileError) {
            console.error('[Download] Surat Keterangan: Error membaca file dari disk:', fileError);
            console.log('[Download] Surat Keterangan: Fallback ke regenerate karena error membaca file');
          }
        } else {
          console.log('[Download] Surat Keterangan: File tidak ditemukan di disk, akan regenerate');
        }
      }

      if (!metadata.nim) {
        console.error('[Download] Surat Keterangan: NIM tidak ditemukan di metadata');
        throw new Error('Metadata dokumen tidak lengkap. NIM mahasiswa tidak ditemukan.');
      }

      if (!metadata.jenis_surat) {
        console.error('[Download] Surat Keterangan: Jenis surat tidak ditemukan di metadata');
        console.warn('[Download] Surat Keterangan: Menggunakan jenis surat default');
      }

      const keteranganData = {
        nomorSurat: document.doc_number,
        nim: metadata.nim,
        jenis_surat: metadata.jenis_surat || 'surat keterangan aktif kuliah',
        keperluan: metadata.keperluan || '',
        kota: metadata.kota || '',
        tanggal: metadata.tanggal || '',
        nama_dekan: metadata.nama_dekan || '',
        nip_dekan: metadata.nip_dekan || '',
        nama: metadata.nama || '',
        program_studi: metadata.program_studi || '',
        tahun_akademik: metadata.tahun_akademik || '',
        status: metadata.status || '',
      };

      console.log('[Download] Surat Keterangan Data:', JSON.stringify(keteranganData));
      result = await keteranganService.processSuratKeteranganGeneration(keteranganData, format);
      break;

    case 'surat_keputusan':
    case 'surat_edaran':
      const keputusanService = require('../modul5_surat_keputusan/service');
      const keputusanData = {
        templateName: metadata.templateName || 'template_surat_keputusan_dekan.docx',
        docType: metadata.docType || null,
        data: {
          perihal: metadata.perihal || '',
          nomor_surat: document.doc_number,
          tempat: metadata.tempat || '',
          tanggal_penetapan: metadata.tanggal_penetapan || '',
          menimbang_rows: metadata.menimbang_rows || [],
          mengingat_rows: metadata.mengingat_rows || [],
          memperhatikan_rows: metadata.memperhatikan_rows || [],
          memutuskan: metadata.memutuskan || {},
          approvers: metadata.approvers || [],
        },
      };
      result = await keputusanService.processSuratGeneration(keputusanData, format);
      break;

    case 'surat_laak':
      const laakService = require('../modul7_surat_laak/service');
      const laakData = {
        jenisSurat: metadata.jenis_surat || 'Surat LAAK',
        nomorSurat: document.doc_number,
        perihal: metadata.perihal || '',
        tujuan: metadata.tujuan || '',
        unit: metadata.unit || '',
        tanggal: metadata.tanggal || '',
        pembuka: metadata.pembuka || '',
        isi: metadata.isi || '',
        penutup: metadata.penutup || '',
        kriteriaList: metadata.kriteriaList || [],
        lampiranList: metadata.lampiranList || [],
        referensiList: metadata.referensiList || [],
      };
      result = await laakService.processSuratLAAK(laakData, format);
      break;

    default:
      throw new Error(`Tipe dokumen ${docType} belum didukung untuk download`);
  }

  return result;
}

/**
 * Export documents to CSV
 * @param {object} params - Filter parameters
 * @returns {Promise<string>} - CSV content
 */
async function exportHistoryService(params) {
  const whereClause = buildDocumentWhereClause(params);

  const documents = await Document.findAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
  });

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

  const csvHeaders = 'Nomor Surat,Jenis Surat,Status,Pembuat,Tanggal Dibuat,Tanggal Diupdate\n';
  const csvRows = formattedDocuments
    .map((doc) => {
      return `"${doc.nomor_surat}","${doc.jenis_surat}","${doc.status}","${doc.pembuat}","${doc.tanggal_dibuat}","${doc.tanggal_diupdate}"`;
    })
    .join('\n');

  return csvHeaders + csvRows;
}

// ============================================
// TEMPLATE SERVICES
// ============================================

/**
 * Get all templates
 * @param {object} filters - Filter parameters
 * @returns {Promise<Array>} - List of templates
 */
async function getAllTemplatesService(filters = {}) {
  const { template_type = '', is_active = '' } = filters;

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

  return templates;
}

/**
 * Get templates by type
 * @param {string} type - Template type
 * @returns {Promise<Array>} - List of templates
 */
async function getTemplatesByTypeService(type) {
  const typeMapping = {
    surat_tugas: ['surat_tugas', 'sppd'],
    sppd: ['sppd', 'surat_tugas'],
    surat_undangan: ['surat_undangan'],
    surat_keterangan: ['surat_keterangan', 'surat_keterangan_aktif_kuliah', 'surat_keterangan_lulus', 'surat_keterangan_kelakuan_baik', 'surat_keterangan_bebas_pinjaman'],
    surat_pengantar: ['surat_pengantar', 'surat_pengantar_A', 'surat_pengantar_B'],
    surat_keputusan: ['surat_keputusan'],
    surat_prodi: ['surat_prodi'],
    surat_laak: ['surat_laak'],
  };

  const templateTypes = typeMapping[type] || [type];

  const templates = await Template.findAll({
    where: {
      template_type: {
        [Op.in]: templateTypes,
      },
      is_active: true,
    },
    order: [['template_name', 'ASC']],
  });

  return templates;
}

/**
 * Get template by ID
 * @param {number} id - Template ID
 * @returns {Promise<object>} - Template object
 */
async function getTemplateByIdService(id) {
  const template = await Template.findOne({ where: { template_id: parseInt(id) } });
  if (!template) {
    throw new Error('Template tidak ditemukan');
  }
  return template;
}

/**
 * Create template
 * @param {object} templateData - Template data
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalName - Original filename
 * @returns {Promise<object>} - Created template
 */
async function createTemplateService(templateData, fileBuffer, originalName) {
  const { template_name, template_type, description, is_active = 'true' } = templateData;

  if (!template_name || !template_type) {
    throw new Error('Template name dan template type wajib diisi');
  }

  if (!fileBuffer) {
    throw new Error('File template wajib diupload');
  }

  const fs = require('fs');
  const path = require('path');

  const uploadDir = path.resolve(__dirname, '../../templates/surat_templates');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `${Date.now()}_${originalName}`;
  const file_path = path.join(uploadDir, fileName);
  fs.writeFileSync(file_path, fileBuffer);

  const relativePath = `src/templates/surat_templates/${fileName}`;

  const template = await Template.create({
    template_name,
    template_type,
    file_path: relativePath,
    variables: null,
    description: description || null,
    is_active: is_active === true || is_active === 'true',
  });

  return template;
}

/**
 * Update template
 * @param {number} id - Template ID
 * @param {object} templateData - Template data to update
 * @param {Buffer} fileBuffer - Optional file buffer
 * @param {string} originalName - Optional original filename
 * @returns {Promise<object>} - Updated template
 */
async function updateTemplateService(id, templateData, fileBuffer = null, originalName = null) {
  const { template_name, template_type, description, variables, is_active } = templateData;

  const template = await Template.findOne({ where: { template_id: parseInt(id) } });
  if (!template) {
    throw new Error('Template tidak ditemukan');
  }

  if (template_name) template.template_name = template_name;
  if (template_type) template.template_type = template_type;
  if (description !== undefined) template.description = description || null;
  if (is_active !== undefined) template.is_active = is_active === true || is_active === 'true';

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

  if (fileBuffer && originalName) {
    const fs = require('fs');
    const path = require('path');

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

    const uploadDir = path.resolve(__dirname, '../../templates/surat_templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${originalName}`;
    const newFilePath = path.join(uploadDir, fileName);
    fs.writeFileSync(newFilePath, fileBuffer);

    template.file_path = `src/templates/surat_templates/${fileName}`;
  }

  await template.save();
  return template;
}

/**
 * Delete template
 * @param {number} id - Template ID
 * @returns {Promise<void>}
 */
async function deleteTemplateService(id) {
  const template = await Template.findOne({ where: { template_id: parseInt(id) } });
  if (!template) {
    throw new Error('Template tidak ditemukan');
  }

  if (template.file_path) {
    const fs = require('fs');
    const path = require('path');
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
}

/**
 * Toggle template active status
 * @param {number} id - Template ID
 * @returns {Promise<object>} - Updated template
 */
async function toggleTemplateActiveService(id) {
  const template = await Template.findOne({ where: { template_id: parseInt(id) } });
  if (!template) {
    throw new Error('Template tidak ditemukan');
  }

  template.is_active = !template.is_active;
  await template.save();

  return {
    template_id: template.template_id,
    template_name: template.template_name,
    is_active: template.is_active,
  };
}

/**
 * Get template file buffer
 * @param {number} id - Template ID
 * @returns {Promise<object>} - File buffer and metadata
 */
async function getTemplateFileService(id) {
  const template = await Template.findOne({ where: { template_id: parseInt(id) } });
  if (!template) {
    throw new Error('Template tidak ditemukan');
  }

  const fs = require('fs');
  const path = require('path');
  const filePath = path.resolve(__dirname, '../../', template.file_path);

  if (!fs.existsSync(filePath)) {
    throw new Error('File template tidak ditemukan');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(template.file_path);

  return {
    buffer: fileBuffer,
    fileName: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

/**
 * Get template file by filename
 * @param {string} filename - Template filename
 * @returns {Promise<object>} - File buffer and metadata
 */
async function getTemplateFileByNameService(filename) {
  const fs = require('fs');
  const path = require('path');
  const decodedFilename = decodeURIComponent(filename);
  const templatesDir = path.resolve(__dirname, '../../templates/surat_templates');
  const templatePath = path.join(templatesDir, decodedFilename);

  // Security: Path traversal protection
  const normalizedTemplatePath = path.normalize(templatePath);
  const normalizedTemplatesDir = path.normalize(templatesDir);

  if (!normalizedTemplatePath.startsWith(normalizedTemplatesDir)) {
    throw new Error('Invalid file path');
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file tidak ditemukan: ${decodedFilename}`);
  }

  const fileBuffer = fs.readFileSync(normalizedTemplatePath);
  return {
    buffer: fileBuffer,
    fileName: decodedFilename,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

module.exports = {
  // User services
  loginService,
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,

  // Document services
  searchDocumentsService,
  getDocumentStatsService,
  downloadDocumentService,
  exportHistoryService,

  // Template services
  getAllTemplatesService,
  getTemplatesByTypeService,
  getTemplateByIdService,
  createTemplateService,
  updateTemplateService,
  deleteTemplateService,
  toggleTemplateActiveService,
  getTemplateFileService,
  getTemplateFileByNameService,
};
