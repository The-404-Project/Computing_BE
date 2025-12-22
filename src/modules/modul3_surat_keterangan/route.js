const { Router } = require('express')
const express = require('express')
const path = require('path')
const controller = require('./controller')

const router = Router()

router.get('/mahasiswa', controller.getMahasiswaByNim)
router.get('/next-number', controller.getNextNumber)
router.post('/generate', controller.generateSuratKeterangan)
router.post('/create', controller.createSuratKeterangan)
router.post('/preview', controller.previewSuratKeterangan)

router.use('/files', express.static(path.join(__dirname, '../../../output/generated_documents')))

module.exports = router
