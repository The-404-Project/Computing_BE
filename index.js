require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');

const PORT = process.env.PORT || 4000;
// jangan diubah ubah dan jangan ditamabhi logika lain lain di file ini!!!
sequelize
  .authenticate()
  .then(() => {
    console.log('Koneksi database berhasil');
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Gagal konek database', err);
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  });
