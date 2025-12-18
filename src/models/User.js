const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), unique: true },
    password_hash: { type: DataTypes.STRING(255) },
    role: { type: DataTypes.ENUM('admin', 'staff', 'kaprodi', 'dekan'), defaultValue: 'staff' },
    full_name: { type: DataTypes.STRING(100) },
    email: { type: DataTypes.STRING(100) }
}, { tableName: 'users', createdAt: 'created_at', updatedAt: false });

module.exports = User;