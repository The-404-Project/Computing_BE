const sequelize = require('../../config/database');
const Document = require('../../models/Document');
const Mahasiswa = require('../../models/Mahasiswa');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { generatePdfFile } = require('../../utils/doc_generator');

// Mapping jenis surat ke template
const templateMap = {
  'surat rekomendasi mahasiswa': 'template_surat_rekomendasi_mahasiswa.docx',
  'surat persetujuan krs': 'template_surat_persetujuan_krs.docx',
  'surat tugas pembimbing akademik': 'template_surat_tugas_pembimbing_akademik.docx',
  'surat keterangan penelitian/skripsi': 'template_surat_keterangan_penelitian_skripsi.docx',
  'surat program studi': 'template_surat_program_studi.docx',
};

/**
 * Cari mahasiswa berdasarkan NIM
 */
async function findMahasiswaByNim(nim) {
  try {
    return await Mahasiswa.findByPk(String(nim));
  } catch (error) {
    console.error('[Modul 6] Error finding mahasiswa:', error);
    return null;
  }
}

/**
 * Cari dosen berdasarkan NIP (simulasi - menggunakan mock data)
 * Sesuai SRS, data dosen bisa disimpan di metadata atau menggunakan mock
 */
async function findDosenByNip(nip) {
  // Menggunakan mock data karena tidak ada tabel dosen di schema
  // Bisa di-extend nanti jika diperlukan tabel terpisah
  const mockDosen = {
    dosen_id: 1,
    nip: nip || 'NIP001',
    nama: 'Dr. Dosen Pembimbing, M.Kom',
    prodi: 'Teknik Informatika',
    jabatan: 'Dosen Pembimbing',
    email: 'dosen@univ.ac.id',
  };
  return mockDosen;
}

/**
 * Generate nomor surat otomatis
 */
async function generateNomorSurat(jenisSurat) {
  try {
    const { Op } = require('sequelize');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Prefix berdasarkan jenis surat
    const prefixMap = {
      'surat rekomendasi mahasiswa': 'SRM',
      'surat persetujuan krs': 'SPK',
      'surat tugas pembimbing akademik': 'STPA',
      'surat keterangan penelitian/skripsi': 'SKP',
    };
    const prefix = prefixMap[String(jenisSurat).toLowerCase()] || 'SPRODI';
    const docType = 'surat_prodi';

    const lastDoc = await Document.findOne({
      where: {
        doc_type: docType,
        doc_number: { [Op.like]: `${prefix}-${year}-${month}-%` },
      },
      order: [['created_at', 'DESC']],
    });

    let nextSeq = 1;
    if (lastDoc && lastDoc.doc_number) {
      const match = lastDoc.doc_number.match(/\d+$/);
      if (match) {
        nextSeq = parseInt(match[0], 10) + 1;
      }
    }

    return `${prefix}-${year}-${month}-${String(nextSeq).padStart(3, '0')}`;
  } catch (error) {
    console.error('[Modul 6] Error generating nomor surat:', error);
    return `SPRODI-${Date.now()}`;
  }
}

/**
 * Buat atau update approval workflow
 * Disimpan di metadata JSON di documents table
 */
async function createApprovalWorkflow(docId, approverId, approvalLevel, status = 'pending') {
  try {
    const doc = await Document.findByPk(docId);
    if (!doc) return null;

    const metadata = doc.metadata || {};
    if (!metadata.approval_workflow) {
      metadata.approval_workflow = [];
    }

    const approval = {
      approval_id: metadata.approval_workflow.length + 1,
      approver_id: approverId,
      approval_level: approvalLevel,
      status: status,
      created_at: new Date().toISOString(),
    };

    metadata.approval_workflow.push(approval);
    doc.metadata = metadata;
    await doc.save();

    return approval;
  } catch (error) {
    console.error('[Modul 6] Error creating approval workflow:', error);
    return null;
  }
}

/**
 * Update status approval
 * Update di metadata JSON di documents table
 */
async function updateApprovalStatus(docId, approverId, status, comments = null, digitalSignature = null) {
  try {
    const doc = await Document.findByPk(docId);
    if (!doc) return null;

    const metadata = doc.metadata || {};
    if (!metadata.approval_workflow) {
      metadata.approval_workflow = [];
    }

    // Cari approval yang sesuai
    const approval = metadata.approval_workflow.find(
      (a) => a.approver_id === approverId && a.status === 'pending'
    );
    if (!approval) return null;

    approval.status = status;
    if (comments) approval.comments = comments;
    if (digitalSignature) approval.digital_signature = digitalSignature;
    if (status === 'approved' || status === 'rejected') {
      approval.approved_at = new Date().toISOString();
    }

    doc.metadata = metadata;
    await doc.save();

    return approval;
  } catch (error) {
    console.error('[Modul 6] Error updating approval status:', error);
    return null;
  }
}

/**
 * Buat history log
 * Disimpan di metadata JSON di documents table
 */
async function createHistoryLog(docId, action, actorId, actorRole, changes = null, comments = null) {
  try {
    const doc = await Document.findByPk(docId);
    if (!doc) return null;

    const metadata = doc.metadata || {};
    if (!metadata.history_log) {
      metadata.history_log = [];
    }

    const logEntry = {
      log_id: metadata.history_log.length + 1,
      action: action,
      actor_id: actorId,
      actor_role: actorRole,
      changes: changes,
      comments: comments,
      created_at: new Date().toISOString(),
    };

    metadata.history_log.push(logEntry);
    doc.metadata = metadata;
    await doc.save();

    return logEntry;
  } catch (error) {
    console.error('[Modul 6] Error creating history log:', error);
    return null;
  }
}

/**
 * Get history log untuk dokumen
 * Diambil dari metadata JSON di documents table
 */
async function getHistoryLog(docId) {
  try {
    const doc = await Document.findByPk(docId);
    if (!doc || !doc.metadata || !doc.metadata.history_log) {
      return [];
    }

    // Ambil user info untuk setiap log entry
    const history = doc.metadata.history_log.map(async (log) => {
      try {
        const user = await User.findByPk(log.actor_id);
        return {
          ...log,
          actor_name: user ? (user.full_name || user.username) : 'Unknown',
        };
      } catch (e) {
        return {
          ...log,
          actor_name: 'Unknown',
        };
      }
    });

    const historyWithUsers = await Promise.all(history);
    return historyWithUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('[Modul 6] Error getting history log:', error);
    return [];
  }
}

/**
 * Get approval workflow untuk dokumen
 * Diambil dari metadata JSON di documents table
 */
async function getApprovalWorkflow(docId) {
  try {
    const doc = await Document.findByPk(docId);
    if (!doc || !doc.metadata || !doc.metadata.approval_workflow) {
      return [];
    }

    // Ambil user info untuk setiap approval
    const approvals = doc.metadata.approval_workflow.map(async (approval) => {
      try {
        const user = await User.findByPk(approval.approver_id);
        return {
          ...approval,
          approver_name: user ? (user.full_name || user.username) : 'Unknown',
          approver_role: user ? user.role : 'Unknown',
        };
      } catch (e) {
        return {
          ...approval,
          approver_name: 'Unknown',
          approver_role: 'Unknown',
        };
      }
    });

    const approvalsWithUsers = await Promise.all(approvals);
    return approvalsWithUsers.sort((a, b) => a.approval_level - b.approval_level);
  } catch (error) {
    console.error('[Modul 6] Error getting approval workflow:', error);
    return [];
  }
}

/**
 * Process surat prodi generation
 */
async function processSuratProdiGeneration(data, format = 'docx') {
  try {
    const {
      nomorSurat,
      nim,
      jenis_surat,
      namaDosen,
      nipDosen,
      judulPenelitian,
      keterangan,
      kota,
      tanggal,
      nama_user,
      role,
    } = data;

    console.log('[Modul 6] Processing generation - Data:', JSON.stringify(data));
    console.log('[Modul 6] Format:', format);

    // Mapping jenis surat
    const key = String(jenis_surat || '').toLowerCase().trim();
    const filenameTemplate = templateMap[key];

    console.log('[Modul 6] Template mapping - Jenis surat:', jenis_surat, '| Key:', key, '| Template filename:', filenameTemplate);

    if (!filenameTemplate) {
      console.error('[Modul 6] Template not found for jenis_surat:', jenis_surat);
      throw new Error(`Jenis surat tidak dikenali: "${jenis_surat}". Pilihan yang tersedia: ${Object.keys(templateMap).join(', ')}`);
    }

    // Ambil data mahasiswa
    let mahasiswaData = {
      nama: '',
      nim: nim || '',
      program_studi: '',
      tahun_akademik: '',
      status: '',
    };

    if (nim) {
      const m = await findMahasiswaByNim(String(nim));
      if (m) {
        const tahunAkademik = m.angkatan ? `${m.angkatan}/${m.angkatan + 1}` : '';
        const statusFormatted = m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : '';
        mahasiswaData = {
          nama: m.nama,
          nim: m.nim,
          program_studi: m.prodi,
          tahun_akademik: tahunAkademik,
          status: statusFormatted,
        };
      }
    }

    // Ambil data dosen
    let dosenData = {
      nama: namaDosen || 'Dr. Dosen Pembimbing, M.Kom',
      nip: nipDosen || 'NIP001',
      prodi: 'Teknik Informatika',
      jabatan: 'Dosen Pembimbing',
    };

    if (nipDosen) {
      const d = await findDosenByNip(String(nipDosen));
      if (d) {
        dosenData = {
          nama: d.nama,
          nip: d.nip,
          prodi: d.prodi || dosenData.prodi,
          jabatan: d.jabatan || dosenData.jabatan,
        };
      }
    }

    // Path template
    const templatePath = path.join(__dirname, '../../templates/surat_templates/', filenameTemplate);

    console.log('[Modul 6] Template path:', templatePath);
    console.log('[Modul 6] Template exists:', fs.existsSync(templatePath));

    // Fallback ke template default jika tidak ada
    if (!fs.existsSync(templatePath)) {
      console.warn(`[Modul 6] Template ${filenameTemplate} not found, using default template`);
      // Gunakan template surat program studi sebagai fallback
      const fallbackTemplate = path.join(__dirname, '../../templates/surat_templates/template_surat_program_studi.docx');
      console.log('[Modul 6] Fallback template path:', fallbackTemplate);
      console.log('[Modul 6] Fallback template exists:', fs.existsSync(fallbackTemplate));
      if (fs.existsSync(fallbackTemplate)) {
        console.log('[Modul 6] Using fallback template');
        const content = fs.readFileSync(fallbackTemplate, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          delimiters: { start: '<<<', end: '>>>' },
          paragraphLoop: true,
          linebreaks: true,
        });

        const renderData = {
          nomor_surat: nomorSurat || '',
          nama: mahasiswaData.nama,
          nim: mahasiswaData.nim,
          program_studi: mahasiswaData.program_studi,
          tahun_akademik: mahasiswaData.tahun_akademik,
          status: mahasiswaData.status,
          nama_dosen: dosenData.nama,
          nip_dosen: dosenData.nip,
          judul_penelitian: judulPenelitian || '',
          keperluan: keterangan || '',
          kota: kota || 'Bandung',
          tanggal: tanggal || '',
          nama_user: nama_user || '',
          role: role || '',
        };

        console.log('[Modul 6] Fallback render data:', JSON.stringify(renderData));

        try {
          doc.render(renderData);
        } catch (err) {
          console.error('[Modul 6] Fallback render error:', err);
          throw new Error('Template fallback gagal dirender: ' + err.message);
        }

        const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        let finalBuffer = docxBuffer;
        let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        let ext = 'docx';

        if (format === 'pdf') {
          finalBuffer = await generatePdfFile(docxBuffer);
          mimeType = 'application/pdf';
          ext = 'pdf';
        }

        const fileName = `surat_prodi_${nomorSurat || Date.now()}.${ext}`;
        return { buffer: finalBuffer, fileName, mimeType };
      }
      throw new Error(`Template tidak ditemukan: ${filenameTemplate}`);
    }

    // Generate DOCX
    console.log('[Modul 6] Reading template file...');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '<<<', end: '>>>' },
      paragraphLoop: true,
      linebreaks: true,
    });

    const renderData = {
      nomor_surat: nomorSurat || '',
      nama: mahasiswaData.nama,
      nim: mahasiswaData.nim,
      program_studi: mahasiswaData.program_studi,
      tahun_akademik: mahasiswaData.tahun_akademik,
      status: mahasiswaData.status,
      nama_dosen: dosenData.nama,
      nip_dosen: dosenData.nip,
      judul_penelitian: judulPenelitian || '',
      keperluan: keterangan || '',
      kota: kota || 'Bandung',
      tanggal: tanggal || '',
      nama_user: nama_user || '',
      role: role || '',
    };

    console.log('[Modul 6] Render data:', JSON.stringify(renderData));

    try {
      doc.render(renderData);
    } catch (err) {
      console.error('[Modul 6] Render error:', err);
      throw new Error('Template gagal dirender: ' + err.message);
    }

    console.log('[Modul 6] Generating DOCX buffer...');
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // Handle PDF conversion
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    if (format === 'pdf') {
      finalBuffer = await generatePdfFile(docxBuffer);
      mimeType = 'application/pdf';
      ext = 'pdf';
    }

    const fileName = `surat_prodi_${nomorSurat || Date.now()}.${ext}`;
    return { buffer: finalBuffer, fileName, mimeType };
  } catch (error) {
    console.error('[Modul 6] Error in processSuratProdiGeneration:', error);
    throw error;
  }
}

module.exports = {
  findMahasiswaByNim,
  findDosenByNip,
  generateNomorSurat,
  createApprovalWorkflow,
  updateApprovalStatus,
  createHistoryLog,
  getHistoryLog,
  getApprovalWorkflow,
  processSuratProdiGeneration,
};

