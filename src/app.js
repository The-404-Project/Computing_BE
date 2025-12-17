const express = require('express')
const cors = require('cors')

// Import Routes
const modul3Router = require('./modules/modul3_surat_keterangan/route')
const modul4Router = require('./modules/modul4_surat_pengantar/route') 
const modul1Router = require('./modules/modul1_surat_tugas/route') // <--- TAMBAH INI

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// --- MOUNTING ROUTES ---

// Modul 3
app.use('/api', modul3Router)

// Modul 4 (Surat Pengantar)
app.use('/api/surat-pengantar', modul4Router) 

// Modul 1 (Surat Tugas) - TAMBAH INI
// URL endpoint: http://localhost:5000/api/surat-tugas/generate
app.use('/api/surat-tugas', modul1Router) 

module.exports = app