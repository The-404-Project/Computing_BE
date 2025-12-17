const User = require('../../models/User');
const { verifyPassword, generateToken } = require('../../utils/auth');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Cari User berdasarkan Username
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Username tidak ditemukan' });
        }

        // 2. Cek Password
        const isMatch = await verifyPassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password salah' });
        }

        // 3. Bikin Token
        const token = generateToken(user);

        // 4. Kirim Response
        res.json({
            message: 'Login berhasil',
            token: token,
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role,
                fullName: user.full_name
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};

module.exports = { login };