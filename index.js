require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

// --- 1. IMPORTS DATABASE & CONFIG ---
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const Document = require('./src/models/Document');
const Mahasiswa = require('./src/models/Mahasiswa'); 

// --- 2. IMPORTS ROUTE MODULES ---
const dashboardRoute = require('./src/modules/modul8_dashboard/route');         
const suratPengantarRoute = require('./src/modules/modul4_surat_pengantar/route'); 
const suratTugasRoute = require('./src/modules/modul1_surat_tugas/route'); 

// 👇 TAMBAHAN WAJIB UNTUK MODUL 2 👇
const suratUndanganRoute = require('./src/modules/modul2_surat_undangan/route'); 

const PORT = process.env.PORT || 4000;

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. REGISTER ROUTES (DAFTAR URL) ---

// Route Auth
app.use('/api/auth', dashboardRoute);

// Route Modul 1 (Surat Tugas)
// URL: http://localhost:4000/api/surat-tugas/create
app.use('/api/surat-tugas', suratTugasRoute);

// Route Modul 2 (Surat Undangan) -> INI YANG BARU DITAMBAHKAN
// URL: http://localhost:4000/api/surat-undangan/create
app.use('/api/surat-undangan', suratUndanganRoute);

// Route Modul 4 (Surat Pengantar)
app.use('/api/surat-pengantar', suratPengantarRoute);

// Route Cek Kesehatan Server
app.get('/', (req, res) => {
  res.send('Backend SIPENA is Running...');
});

// --- 5. DATABASE RELATIONS & SYNC ---
User.hasMany(Document, { foreignKey: 'created_by' });
Document.belongsTo(User, { foreignKey: 'created_by' });

// --- 6. START SERVER ---
sequelize.sync({ force: false, alter: true })
  .then(() => {
    console.log('✅ DATABASE CONNECTED: DB_PersuratanFakultas');
    
    app.listen(PORT, () => {
      console.log(`🚀 SERVER RUNNING ON: http://localhost:${PORT}`);
      console.log(`   👉 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`   👉 Modul 1 (Tugas): http://localhost:${PORT}/api/surat-tugas`);
      console.log(`   👉 Modul 2 (Undangan): http://localhost:${PORT}/api/surat-undangan`); // <-- Log baru
      console.log(`   👉 Modul 4 (Pengantar): http://localhost:${PORT}/api/surat-pengantar`);
    });
  })
  .catch((err) => {
    console.error('❌ DATABASE CONNECTION FAILED:', err);
  });