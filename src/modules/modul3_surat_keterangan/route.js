const { Router } = require('express')
const controller = require('./controller')

const router = Router()

router.get('/mahasiswa', controller.getMahasiswaByNim)
router.post('/surat-keterangan/aktif/generate', controller.generateSuratKeteranganAktif)
router.post('/surat-keterangan/generate', controller.generateSuratKeterangan)

module.exports = router
