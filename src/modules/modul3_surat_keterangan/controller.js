const service = require('./service')

async function getMahasiswaByNim(req, res) {
  const { nim } = req.query
  if (!nim) {
    return res.status(400).json({ message: 'nim query required' })
  }
  try {
    const m = await service.findMahasiswaByNim(String(nim))
    if (!m) {
      return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' })
    }
    const tahunAkademik = m.angkatan ? `${m.angkatan}/${m.angkatan + 1}` : null
    return res.json({
      nim: m.nim,
      namaMahasiswa: m.nama,
      programStudi: m.prodi,
      status: m.status.charAt(0).toUpperCase() + m.status.slice(1),
      tahunAkademik,
      email: m.email,
    })
  } catch (e) {
    return res.status(500).json({ message: 'Kesalahan server' })
  }
}

module.exports = { getMahasiswaByNim }
