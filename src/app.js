const path = require('path');
const express = require('express');
const cors = require('cors');

const User = require('./models/User');
const Document = require('./models/Document');
const Mahasiswa = require('./models/Mahasiswa');
const Template = require('./models/Template');

const suratTugasRoute = require('./modules/modul1_surat_tugas/route');
const suratUndanganRoute = require('./modules/modul2_surat_undangan/route');
const suratKeteranganRoute = require('./modules/modul3_surat_keterangan/route');
const suratPengantarRoute = require('./modules/modul4_surat_pengantar/route');
const suratKeputusanRoute = require('./modules/modul5_surat_keputusan/route');
const suratProdiRoute = require('./modules/modul6_surat_prodi/route');
const suratLaakRoute = require('./modules/modul7_surat_laak/route');
const dashboardRoute = require('./modules/modul8_dashboard/route');

const app = express();

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

 
 
// untuk setiap modul menambkan route seperti ini, untuk sub routenya harus di folder routes masing masing!!!!
// jangan menambahkan logika modul di sini!!!
app.use('/api/auth', dashboardRoute);
app.use('/api/surat-tugas', suratTugasRoute);
app.use('/api/surat-undangan', suratUndanganRoute);
app.use('/api/surat-keterangan', suratKeteranganRoute);
app.use('/api/surat-pengantar', suratPengantarRoute);
app.use('/api/surat-keputusan', suratKeputusanRoute);
app.use('/api/surat-prodi', suratProdiRoute);
app.use('/api/surat-laak', suratLaakRoute);
app.use('/api/dashboard', dashboardRoute);

module.exports = app;
