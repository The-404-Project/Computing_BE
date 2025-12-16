const express = require('express')
const cors = require('cors')

// Import Routes
const modul3Router = require('./modules/modul3_surat_keterangan/route')
const modul4Router = require('./modules/modul4_surat_pengantar/route') 

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// --- MOUNTING ROUTES ---

// Modul 3
app.use('/api', modul3Router)

// Modul 4 (Surat Pengantar)
// URL endpoint: http://localhost:5000/api/surat-pengantar/generate
app.use('/api/surat-pengantar', modul4Router) 

module.exports = app