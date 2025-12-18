const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const { verifyPassword, generateToken } = require('../../utils/auth');

// Login (sudah ada)
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Username tidak ditemukan' });
    }
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }
    const token = generateToken(user);
    res.json({
      message: 'Login berhasil',
      token: token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// Get All Users (hanya admin)
const getAllUsers = async (req, res) => {
  try {
    // TODO: Tambahkan middleware auth check
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
    });
    res.json({ users });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data users' });
  }
};

// Get User by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
};

// Create User (hanya admin)
const createUser = async (req, res) => {
  try {
    const { username, password, role, full_name, email } = req.body;

    // Validasi
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, dan role wajib diisi' });
    }

    // Cek username sudah ada
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      password_hash,
      role: role || 'staff',
      full_name: full_name || null,
      email: email || null,
    });

    res.status(201).json({
      message: 'User berhasil dibuat',
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ message: 'Gagal membuat user' });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, full_name, email } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Update fields
    if (username) user.username = username;
    if (role) user.role = role;
    if (full_name !== undefined) user.full_name = full_name;
    if (email !== undefined) user.email = email;

    // Update password jika ada
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      message: 'User berhasil diupdate',
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: 'Gagal mengupdate user' });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Jangan hapus user sendiri
    // TODO: Tambahkan check untuk mencegah hapus user yang sedang login

    await user.destroy();

    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'Gagal menghapus user' });
  }
};

module.exports = {
  login,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
