const { Router } = require('express')
const controller = require('./controller')

const router = Router()

router.get('/mahasiswa', controller.getMahasiswaByNim)
router.post('/aktif/generate', controller.generateSuratKeteranganAktif)
router.post('/generate', controller.generateSuratKeterangan)

module.exports = router
