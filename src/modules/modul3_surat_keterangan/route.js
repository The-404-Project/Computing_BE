const { Router } = require('express')
const controller = require('./controller')

const router = Router()

router.get('/mahasiswa', controller.getMahasiswaByNim)

module.exports = router
