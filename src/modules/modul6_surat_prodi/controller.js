const service = require('./service');
const Document = require('../../models/Document');
const User = require('../../models/User');

/**
 * GET /mahasiswa - Cari mahasiswa berdasarkan NIM
 */
async function getMahasiswaByNim(req, res) {
  const { nim } = req.query;
  if (!nim) {
    return res.status(400).json({ message: 'nim query required' });
  }
  try {
    const m = await service.findMahasiswaByNim(String(nim));
    if (!m) {
      return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
    }
    const tahunAkademik = m.angkatan ? `${m.angkatan}/${m.angkatan + 1}` : null;
    return res.json({
      nim: m.nim,
      namaMahasiswa: m.nama,
      programStudi: m.prodi,
      status: m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : '',
      tahunAkademik,
      email: m.email,
    });
  } catch (e) {
    console.error('[Modul 6] Error getMahasiswaByNim:', e);
    return res.status(500).json({ message: 'Kesalahan server' });
  }
}

/**
 * GET /dosen - Cari dosen berdasarkan NIP
 */
async function getDosenByNip(req, res) {
  const { nip } = req.query;
  if (!nip) {
    return res.status(400).json({ message: 'nip query required' });
  }
  try {
    const d = await service.findDosenByNip(String(nip));
    if (!d) {
      return res.status(404).json({ message: 'Dosen tidak ditemukan' });
    }
    return res.json({
      nip: d.nip,
      nama: d.nama,
      prodi: d.prodi,
      jabatan: d.jabatan,
      email: d.email,
    });
  } catch (e) {
    console.error('[Modul 6] Error getDosenByNip:', e);
    return res.status(500).json({ message: 'Kesalahan server' });
  }
}

/**
 * GET /next-number - Generate nomor surat berikutnya
 */
async function getNextNumber(req, res) {
  try {
    const { jenis_surat } = req.query;
    const nextNumber = await service.generateNomorSurat(jenis_surat || 'surat rekomendasi mahasiswa');
    return res.json({ nextNumber });
  } catch (e) {
    console.error('[Modul 6] Error getNextNumber:', e);
    return res.status(500).json({ message: 'Gagal mengambil nomor surat berikutnya' });
  }
}

/**
 * POST /create - Buat draft surat prodi
 */
async function createDraft(req, res) {
  try {
    const body = req.body || {};
    const {
      nomorSurat,
      nim,
      jenis_surat,
      namaDosen,
      nipDosen,
      judulPenelitian,
      keterangan,
    } = body;

    if (!nim) {
      return res.status(400).json({ message: 'nim required' });
    }
    if (!jenis_surat) {
      return res.status(400).json({ message: 'jenis_surat required' });
    }

    // Generate nomor surat jika belum ada
    let finalNomorSurat = nomorSurat;
    if (!finalNomorSurat) {
      finalNomorSurat = await service.generateNomorSurat(jenis_surat);
    }

    // Cek apakah sudah ada
    const existing = await Document.findOne({ where: { doc_number: finalNomorSurat } });
    if (existing) {
      return res.status(409).json({
        message: `Surat dengan nomor ${finalNomorSurat} sudah ada`,
        doc_id: existing.id,
      });
    }

    // Ambil user dari token
    const user_id = req.user ? req.user.user_id : 1;
    let currentUserRole = 'staff';
    try {
      const user = await User.findByPk(user_id);
      if (user) currentUserRole = user.role;
    } catch (e) {
      // ignore
    }

    // Simpan sebagai draft
    const doc = await Document.create({
      doc_number: finalNomorSurat,
      doc_type: 'surat_prodi',
      status: 'draft',
      created_by: user_id,
      metadata: {
        nim,
        jenis_surat,
        namaDosen,
        nipDosen,
        judulPenelitian,
        keterangan,
        created_at: new Date().toISOString(),
      },
    });

    // Buat history log
    await service.createHistoryLog(doc.id, 'created', user_id, currentUserRole, {
      status: 'draft',
      nomor_surat: finalNomorSurat,
    });

    return res.json({
      message: 'Draft surat berhasil dibuat',
      doc_id: doc.id,
      doc_number: finalNomorSurat,
      status: 'draft',
    });
  } catch (error) {
    console.error('[Modul 6] Error createDraft:', error);
    return res.status(500).json({ message: 'Gagal membuat draft surat', error: error.message });
  }
}

/**
 * POST /submit - Submit draft untuk approval
 */
async function submitForApproval(req, res) {
  try {
    const { doc_id } = req.body;
    if (!doc_id) {
      return res.status(400).json({ message: 'doc_id required' });
    }

    const doc = await Document.findByPk(doc_id);
    if (!doc) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    if (doc.status !== 'draft') {
      return res.status(400).json({ message: `Dokumen sudah dalam status ${doc.status}` });
    }

    const user_id = req.user ? req.user.user_id : 1;
    let currentUserRole = 'staff';
    try {
      const user = await User.findByPk(user_id);
      if (user) currentUserRole = user.role;
    } catch (e) {
      // ignore
    }

    // Update status ke submitted
    doc.status = 'submitted';
    await doc.save();

    // Buat approval workflow (multi-level)
    // Level 1: Staff (auto approve jika creator adalah staff)
    // Level 2: Kaprodi
    // Level 3: Dekan
    if (currentUserRole !== 'kaprodi' && currentUserRole !== 'dekan') {
      await service.createApprovalWorkflow(doc.id, user_id, 1, 'approved');
    }
    // Level 2: Kaprodi (pending)
    const kaprodi = await User.findOne({ where: { role: 'kaprodi' } });
    if (kaprodi) {
      await service.createApprovalWorkflow(doc.id, kaprodi.user_id, 2, 'pending');
    }
    // Level 3: Dekan (pending)
    const dekan = await User.findOne({ where: { role: 'dekan' } });
    if (dekan) {
      await service.createApprovalWorkflow(doc.id, dekan.user_id, 3, 'pending');
    }

    // History log
    await service.createHistoryLog(doc.id, 'submitted', user_id, currentUserRole, {
      status: 'submitted',
    });

    return res.json({
      message: 'Surat berhasil disubmit untuk approval',
      doc_id: doc.id,
      status: 'submitted',
    });
  } catch (error) {
    console.error('[Modul 6] Error submitForApproval:', error);
    return res.status(500).json({ message: 'Gagal submit surat', error: error.message });
  }
}

/**
 * POST /approve - Approve surat
 */
async function approveSurat(req, res) {
  try {
    const { doc_id, comments, digital_signature } = req.body;
    if (!doc_id) {
      return res.status(400).json({ message: 'doc_id required' });
    }

    const doc = await Document.findByPk(doc_id);
    if (!doc) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    const user_id = req.user ? req.user.user_id : 1;
    let currentUserRole = 'staff';
    try {
      const user = await User.findByPk(user_id);
      if (user) currentUserRole = user.role;
    } catch (e) {
      // ignore
    }

    // Cari approval workflow untuk user ini
    const approvals = await service.getApprovalWorkflow(doc.id);
    const userApproval = approvals.find((a) => a.approver_id === user_id && a.status === 'pending');
    if (!userApproval) {
      return res.status(403).json({ message: 'Anda tidak memiliki approval pending untuk dokumen ini' });
    }

    // Update approval
    await service.updateApprovalStatus(doc.id, user_id, 'approved', comments, digital_signature);

    // Cek apakah semua approval sudah selesai
    const allApprovals = await service.getApprovalWorkflow(doc.id);
    const allApproved = allApprovals.every((a) => a.status === 'approved' || a.status === 'rejected');
    const anyRejected = allApprovals.some((a) => a.status === 'rejected');

    if (allApproved && !anyRejected) {
      doc.status = 'approved';
      await doc.save();
    }

    // History log
    await service.createHistoryLog(doc.id, 'approved', user_id, currentUserRole, {
      approval_level: userApproval.approval_level,
      comments,
    });

    return res.json({
      message: 'Surat berhasil disetujui',
      doc_id: doc.id,
      status: doc.status,
    });
  } catch (error) {
    console.error('[Modul 6] Error approveSurat:', error);
    return res.status(500).json({ message: 'Gagal approve surat', error: error.message });
  }
}

/**
 * POST /reject - Reject surat
 */
async function rejectSurat(req, res) {
  try {
    const { doc_id, comments } = req.body;
    if (!doc_id) {
      return res.status(400).json({ message: 'doc_id required' });
    }

    const doc = await Document.findByPk(doc_id);
    if (!doc) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    const user_id = req.user ? req.user.user_id : 1;
    let currentUserRole = 'staff';
    try {
      const user = await User.findByPk(user_id);
      if (user) currentUserRole = user.role;
    } catch (e) {
      // ignore
    }

    // Cari approval workflow
    const approvals = await service.getApprovalWorkflow(doc.id);
    const userApproval = approvals.find((a) => a.approver_id === user_id && a.status === 'pending');
    if (!userApproval) {
      return res.status(403).json({ message: 'Anda tidak memiliki approval pending untuk dokumen ini' });
    }

    // Update approval
    await service.updateApprovalStatus(doc.id, user_id, 'rejected', comments);

    // Update dokumen status
    doc.status = 'rejected';
    await doc.save();

    // History log
    await service.createHistoryLog(doc.id, 'rejected', user_id, currentUserRole, {
      approval_level: userApproval.approval_level,
      comments,
    });

    return res.json({
      message: 'Surat ditolak',
      doc_id: doc.id,
      status: 'rejected',
    });
  } catch (error) {
    console.error('[Modul 6] Error rejectSurat:', error);
    return res.status(500).json({ message: 'Gagal reject surat', error: error.message });
  }
}

/**
 * GET /history/:doc_id - Get history log
 */
async function getHistory(req, res) {
  try {
    const { doc_id } = req.params;
    const history = await service.getHistoryLog(parseInt(doc_id));
    return res.json({ history });
  } catch (error) {
    console.error('[Modul 6] Error getHistory:', error);
    return res.status(500).json({ message: 'Gagal mengambil history', error: error.message });
  }
}

/**
 * GET /approval/:doc_id - Get approval workflow
 */
async function getApproval(req, res) {
  try {
    const { doc_id } = req.params;
    const approvals = await service.getApprovalWorkflow(parseInt(doc_id));
    return res.json({ approvals });
  } catch (error) {
    console.error('[Modul 6] Error getApproval:', error);
    return res.status(500).json({ message: 'Gagal mengambil approval workflow', error: error.message });
  }
}

/**
 * POST /preview - Preview surat
 */
async function previewSurat(req, res) {
  try {
    const body = req.body || {};
    const { nim, jenis_surat, namaDosen, nipDosen, judulPenelitian, keterangan } = body;

    if (!nim || !jenis_surat) {
      return res.status(400).json({ message: 'nim dan jenis_surat required' });
    }

    // Ambil user info
    let currentUserName = '';
    let currentUserRole = '';
    try {
      const authHeader = req.headers.authorization || '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const jwt = require('jsonwebtoken');
        const { SECRET_KEY } = require('../../utils/auth');
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded) {
          currentUserRole = decoded.role || '';
          const user = await User.findOne({ where: { user_id: decoded.user_id } });
          currentUserName = (user && user.full_name) ? user.full_name : decoded.username;
        }
      }
    } catch (e) {
      // ignore
    }

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const formatDateID = (d) => `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

    const payload = {
      nomorSurat: body.nomorSurat || 'XXX/PREVIEW/2025',
      nim,
      jenis_surat,
      namaDosen,
      nipDosen,
      judulPenelitian,
      keterangan,
      kota: 'Bandung',
      tanggal: formatDateID(new Date()),
      nama_user: currentUserName,
      role: currentUserRole,
    };

    const result = await service.processSuratProdiGeneration(payload, 'pdf');
    const { addWatermarkToPdf } = require('../../utils/doc_generator');
    const watermarked = await addWatermarkToPdf(result.buffer);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=preview.pdf',
      'Content-Length': watermarked.length,
    });
    return res.send(watermarked);
  } catch (error) {
    console.error('[Modul 6] Error previewSurat:', error);
    return res.status(500).json({ message: 'Gagal membuat preview', error: error.message });
  }
}

/**
 * POST /generate - Generate final surat
 */
async function generateSurat(req, res) {
  try {
    const body = req.body || {};
    const { doc_id, nim, jenis_surat, namaDosen, nipDosen, judulPenelitian, keterangan } = body;

    if (!nim || !jenis_surat) {
      return res.status(400).json({ message: 'nim dan jenis_surat required' });
    }

    // Cek status dokumen
    let doc = null;
    if (doc_id) {
      doc = await Document.findByPk(doc_id);
      if (!doc) {
        return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
      }
      if (doc.status !== 'approved' && doc.status !== 'draft') {
        return res.status(400).json({ message: `Dokumen harus dalam status approved atau draft. Status saat ini: ${doc.status}` });
      }
    }

    const requestedFormat = req.query.format || 'docx';

    // Ambil user info
    let currentUserName = '';
    let currentUserRole = '';
    try {
      const authHeader = req.headers.authorization || '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const jwt = require('jsonwebtoken');
        const { SECRET_KEY } = require('../../utils/auth');
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded) {
          currentUserRole = decoded.role || '';
          const user = await User.findOne({ where: { user_id: decoded.user_id } });
          currentUserName = (user && user.full_name) ? user.full_name : decoded.username;
        }
      }
    } catch (e) {
      // ignore
    }

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const formatDateID = (d) => `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

    const nomorSurat = doc ? doc.doc_number : (body.nomorSurat || await service.generateNomorSurat(jenis_surat));

    const payload = {
      nomorSurat,
      nim,
      jenis_surat,
      namaDosen,
      nipDosen,
      judulPenelitian,
      keterangan,
      kota: 'Bandung',
      tanggal: formatDateID(new Date()),
      nama_user: currentUserName,
      role: currentUserRole,
    };

    const result = await service.processSuratProdiGeneration(payload, requestedFormat);

    // Simpan ke database jika belum ada
    if (!doc) {
      const user_id = req.user ? req.user.user_id : 1;
      await Document.create({
        doc_number: nomorSurat,
        doc_type: 'surat_prodi',
        status: 'generated',
        created_by: user_id,
        file_path: result.fileName,
        metadata: {
          ...payload,
          generated_filename: result.fileName,
        },
      });
    } else {
      // Update metadata
      doc.metadata = {
        ...(doc.metadata || {}),
        ...payload,
        generated_filename: result.fileName,
      };
      doc.file_path = result.fileName;
      if (doc.status === 'approved') {
        doc.status = 'generated';
      }
      await doc.save();
    }

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename=${result.fileName}`,
      'Content-Length': result.buffer.length,
    });
    return res.send(result.buffer);
  } catch (error) {
    console.error('[Modul 6] Error generateSurat:', error);
    return res.status(500).json({ message: 'Gagal membuat surat', error: error.message });
  }
}

module.exports = {
  getMahasiswaByNim,
  getDosenByNip,
  getNextNumber,
  createDraft,
  submitForApproval,
  approveSurat,
  rejectSurat,
  getHistory,
  getApproval,
  previewSurat,
  generateSurat,
};

