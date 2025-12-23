const service = require('./service');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

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
      status: m.status.charAt(0).toUpperCase() + m.status.slice(1),
      tahunAkademik,
      email: m.email,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Kesalahan server' });
  }
}

module.exports = { getMahasiswaByNim };

async function generateSuratKeterangan(req, res) {
  const body = req.body || {};
  const jenis = body.jenis_surat || body.jenisSurat || '';
  const nim = body.nim;
  if (!nim) {
    return res.status(400).json({ message: 'nim required' });
  }
  if (!body.nomor_surat) {
    return res.status(400).json({ message: 'nomor_surat required' });
  }
  // Ambil user dari token jika tersedia
  let currentUserName = null;
  let currentUserRole = null;
  try {
    const authHeader = req.headers.authorization || '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const jwt = require('jsonwebtoken');
      const { SECRET_KEY } = require('../../utils/auth');
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded) {
        currentUserRole = decoded.role || null;
        const User = require('../../models/User');
        const userRow = await User.findOne({ where: { user_id: decoded.user_id } });
        currentUserName = (userRow && userRow.full_name) ? userRow.full_name : decoded.username;
      }
    }
  } catch (e) {
    // ignore token errors; fallback ke payload jika ada
  }
  const map = {
    'surat keterangan aktif kuliah': 'template_surat_keterangan_mahasiswa_aktif.docx',
    'surat keterangan lulus': 'template_surat_keterangan_lulus.docx',
    'surat keterangan bebas pinjaman': 'template_surat_keterangan_bebas_pinjaman.docx',
    'surat keterangan kelakuan baik': 'template_surat_keterangan_kelakuan_baik.docx',
  };
  const key = String(jenis).toLowerCase().trim();
  const filenameTemplate = map[key];
  if (!filenameTemplate) {
    return res.status(400).json({ message: 'jenis_surat tidak dikenali' });
  }
  try {
    const existing = await service.findDokumenByNomor(String(body.nomor_surat));
    if (existing) {
      return res.status(409).json({ message: `Surat dengan nomor registrasi ${body.nomor_surat} sudah ada`, file: existing.file_path || existing.file_name });
    }
    const m = await service.findMahasiswaByNim(String(nim));
    if (!m) {
      return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
    }
    const statusLower = String(m.status || '')
      .toLowerCase()
      .trim();
    if (key === 'surat keterangan aktif kuliah' && statusLower !== 'aktif') {
      return res.status(400).json({ message: 'Mahasiswa tidak berstatus aktif, tidak dapat membuat Surat Keterangan Aktif Kuliah' });
    }
    if (key === 'surat keterangan lulus' && statusLower !== 'lulus') {
      return res.status(400).json({ message: 'Mahasiswa belum lulus, tidak dapat membuat Surat Keterangan Lulus' });
    }
    const tahunAkademik = m.angkatan ? `${m.angkatan}/${m.angkatan + 1}` : '';
    const status = m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : '';

    const templatePath = path.join(__dirname, '../../templates/surat_templates/', filenameTemplate);
    const outputDir = path.join(__dirname, '../../../output/generated_documents');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const desiredName = `surat_keterangan_${String(body.nomor_surat)}.docx`;
    const desiredPath = path.join(outputDir, desiredName);
    if (fs.existsSync(desiredPath)) {
      return res.status(409).json({ message: `Surat dengan nomor registrasi ${body.nomor_surat} sudah ada`, file: desiredName });
    }
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { delimiters: { start: '<<<', end: '>>>' }, paragraphLoop: true, linebreaks: true });
    try {
      doc.render({
        nomor_surat: body.nomor_surat || '',
        nama: m.nama,
        nim: m.nim,
        program_studi: m.prodi,
        tahun_akademik: tahunAkademik,
        status,
        keperluan: body.keperluan || '',
        kota: body.kota || '',
        tanggal: body.tanggal || '',
        nama_dekan: body.nama_dekan || '',
        nip_dekan: body.nip_dekan || '',
        nama_user: body.nama_user || currentUserName || '',
        role: body.role || currentUserRole || '',
      });
    } catch (err) {
      return res.status(400).json({ message: 'Template gagal dirender' });
    }
    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    fs.writeFileSync(desiredPath, buf);

    // Mock User ID (Nanti ganti dengan req.user.id dari middleware auth)
    const user_id = req.user ? req.user.user_id : 1;

    // Simpan ke database dengan semua metadata yang diperlukan
    await service.createDokumen({
      nomor_registrasi: String(body.nomor_surat),
      nim: String(m.nim),
      jenis_surat: key,
      file_name: desiredName,
      created_by: user_id,
      nama: m.nama,
      program_studi: m.prodi,
      tahun_akademik: tahunAkademik,
      status_mahasiswa: status,
      keperluan: body.keperluan || '',
      kota: body.kota || '',
      tanggal: body.tanggal || '',
      nama_dekan: body.nama_dekan || '',
      nip_dekan: body.nip_dekan || '',
      nama_user: body.nama_user || currentUserName || null,
      role: body.role || currentUserRole || null,
    });

    return res.json({ message: 'Dokumen berhasil dibuat', file: desiredName });
  } catch (e) {
    console.error('Error Modul 3:', e);
    return res.status(500).json({ message: 'Kesalahan server', error: e.message });
  }
}

async function getNextNumber(req, res) {
  try {
    const nextNumber = await service.getNextDocNumber();
    return res.json({ nextNumber });
  } catch (e) {
    console.error('Error fetching next number:', e);
    return res.status(500).json({ message: 'Gagal mengambil nomor surat berikutnya' });
  }
}

module.exports.generateSuratKeterangan = generateSuratKeterangan;
module.exports.getNextNumber = getNextNumber;
const { addWatermarkToPdf } = require('../../utils/doc_generator');
const Document = require('../../models/Document');

async function previewSuratKeterangan(req, res) {
  try {
    const body = req.body || {};
    const jenis = body.jenis_surat || body.jenisSurat || '';
    const nim = body.nim || '';

    if (!jenis) {
      return res.status(400).json({ message: 'jenis_surat required' });
    }
    if (!nim) {
      return res.status(400).json({ message: 'nim required' });
    }

    let currentUserName = null;
    let currentUserRole = null;
    try {
      const authHeader = req.headers.authorization || '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const jwt = require('jsonwebtoken');
        const { SECRET_KEY } = require('../../utils/auth');
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded) {
          currentUserRole = decoded.role || null;
          const User = require('../../models/User');
          const userRow = await User.findOne({ where: { user_id: decoded.user_id } });
          currentUserName = (userRow && userRow.full_name) ? userRow.full_name : decoded.username;
        }
      }
    } catch (e) {
      // ignore
    }

    const finalNomorSurat = body.nomorSurat || body.nomor_surat || 'XXX/PREVIEW/2025';

    const payload = {
      nomorSurat: finalNomorSurat,
      nim: nim,
      jenis_surat: jenis,
      keperluan: body.keperluan || body.keterangan || '',
      kota: body.kota || 'Bandung',
      tanggal: body.tanggal || '',
      nama_dekan: body.nama_dekan || '',
      nip_dekan: body.nip_dekan || '',
      nama_user: body.nama_user || currentUserName || '',
      role: body.role || currentUserRole || '',
    };

    const result = await service.processSuratKeteranganGeneration(payload, 'pdf');
    const watermarked = await addWatermarkToPdf(result.buffer);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=preview.pdf',
      'Content-Length': watermarked.length,
    });
    return res.send(watermarked);
  } catch (error) {
    console.error('Error Preview Modul 3:', error);
    return res.status(500).json({
      message: 'Gagal membuat preview',
      error: error.message,
    });
  }
}

async function createSuratKeterangan(req, res) {
  try {
    const body = req.body || {};
    const jenis = body.jenis_surat || body.jenisSurat || '';
    const nim = body.nim || '';

    if (!jenis) {
      return res.status(400).json({ message: 'jenis_surat required' });
    }
    if (!nim) {
      return res.status(400).json({ message: 'nim required' });
    }

    let finalNomorSurat = body.nomorSurat || body.nomor_surat || null;
    if (!finalNomorSurat) {
      try {
        finalNomorSurat = await service.getNextDocNumber();
      } catch {
        finalNomorSurat = `SK-${Date.now()}`;
      }
    }

    const requestedFormat = (req.query && req.query.format) ? String(req.query.format) : 'docx';

    let currentUserName = null;
    let currentUserRole = null;
    try {
      const authHeader = req.headers.authorization || '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const jwt = require('jsonwebtoken');
        const { SECRET_KEY } = require('../../utils/auth');
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded) {
          currentUserRole = decoded.role || null;
          const User = require('../../models/User');
          const userRow = await User.findOne({ where: { user_id: decoded.user_id } });
          currentUserName = (userRow && userRow.full_name) ? userRow.full_name : decoded.username;
        }
      }
    } catch (e) {
      // ignore
    }

    const payload = {
      nomorSurat: finalNomorSurat,
      nim: nim,
      jenis_surat: jenis,
      keperluan: body.keperluan || body.keterangan || '',
      kota: body.kota || 'Bandung',
      tanggal: body.tanggal || '',
      nama_dekan: body.nama_dekan || '',
      nip_dekan: body.nip_dekan || '',
      nama_user: body.nama_user || currentUserName || '',
      role: body.role || currentUserRole || '',
    };

    const result = await service.processSuratKeteranganGeneration(payload, requestedFormat);

    try {
      const user_id = req.user ? req.user.user_id : 1;
      await Document.create({
        doc_number: finalNomorSurat,
        doc_type: 'surat_keterangan',
        status: 'generated',
        created_by: user_id,
        file_path: null,
        metadata: {
          nim,
          jenis_surat: jenis,
          keperluan: payload.keperluan,
          kota: payload.kota,
          tanggal: payload.tanggal,
          nama_dekan: payload.nama_dekan,
          nip_dekan: payload.nip_dekan,
          nama_user: payload.nama_user,
          role: payload.role,
          generated_filename: result.fileName,
        },
      });
    } catch (dbError) {
      console.error('[Modul 3] Error saving to database:', dbError);
    }

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename=${result.fileName}`,
      'Content-Length': result.buffer.length,
    });
    return res.send(result.buffer);
  } catch (error) {
    console.error('Error Create Modul 3:', error);
    return res.status(500).json({
      message: 'Gagal membuat surat keterangan',
      error: error.message,
    });
  }
}

module.exports.previewSuratKeterangan = previewSuratKeterangan;
module.exports.createSuratKeterangan = createSuratKeterangan;
