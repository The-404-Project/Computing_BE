const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const sequelize = require('./src/config/database');

async function createAdmin() {
    try {
        await sequelize.sync(); // Pastikan connect dulu

        // 1. Cek apakah admin sudah ada?
        const existingUser = await User.findOne({ where: { username: 'admin' } });
        if (existingUser) {
            console.log('⚠️ User admin sudah ada!');
            return;
        }

        // 2. Hash Password (misal: 'admin123')
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // 3. Create User
        await User.create({
            username: 'admin',
            password_hash: hashedPassword,
            full_name: 'Administrator Utama',
            email: 'admin@fakultas.ac.id',
            role: 'admin'
        });

        console.log('✅ SUKSES: User admin berhasil dibuat!');
        console.log('👉 Username: admin');
        console.log('👉 Password: admin123');

    } catch (error) {
        console.error('❌ GAGAL:', error);
    }
}

createAdmin();