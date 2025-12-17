const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ambil dari .env, kalau kosong pakai default (biar ga crash)
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key';

const verifyPassword = async (inputPassword, dbPasswordHash) => {
    return await bcrypt.compare(inputPassword, dbPasswordHash);
};

const generateToken = (user) => {
    return jwt.sign(
        { 
            user_id: user.user_id, 
            role: user.role, 
            username: user.username 
        },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
};

module.exports = { verifyPassword, generateToken, SECRET_KEY };