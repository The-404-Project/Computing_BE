const express = require('express');
const cors = require('cors');

const User = require('./models/User');
const Document = require('./models/Document');
const Mahasiswa = require('./models/Mahasiswa');
const Template = require('./models/Template');

const dashboardRoute = require('./modules/modul8_dashboard/route');
const suratTugasRoute = require('./modules/modul1_surat_tugas/route');
const suratUndanganRoute = require('./modules/modul2_surat_undangan/route');
const suratKeteranganRoute = require('./modules/modul3_surat_keterangan/route');
const suratPengantarRoute = require('./modules/modul4_surat_pengantar/route');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// untuk setiap modul menambkan route seperti ini, untuk sub routenya harus di folder routes masing masing!!!!
// jangan menambahkan logika modul di sini!!!
app.use('/api/auth', dashboardRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api', suratTugasRoute);
app.use('/api/surat-undangan', suratUndanganRoute);
app.use('/api', suratKeteranganRoute);
app.use('/api', suratPengantarRoute);

module.exports = app;
