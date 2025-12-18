const express = require('express')
const path = require('path')
const modul3Router = require('./modules/modul3_surat_keterangan/route')

const app = express()

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json())

app.use('/files', express.static(path.join(__dirname, '../output/generated_documents')))

app.use('/api', modul3Router)

module.exports = app

