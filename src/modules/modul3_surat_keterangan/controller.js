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
    });

    return res.json({ message: 'Dokumen berhasil dibuat', file: desiredName });
  } catch (e) {
    console.error('Error Modul 3:', e);
    return res.status(500).json({ message: 'Kesalahan server', error: e.message });
  }
}

module.exports.generateSuratKeterangan = generateSuratKeterangan;
