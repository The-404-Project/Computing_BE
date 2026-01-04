const { Sequelize } = require('sequelize');

// Database configuration dengan default values (seperti settings.js)
const dbName = process.env.DB_NAME || 'db_persuratanfakultas';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || 'root';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Test connection (optional)
sequelize
  .authenticate()
  .then(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Database connection established.');
    }
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
  });

module.exports = sequelize;
