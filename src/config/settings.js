const { Sequelize } = require('sequelize');

const dbName = process.env.DB_NAME || 'DB_PersuratanFakultas';
const dbUser = process.env.DB_USER || '';
const dbPass = process.env.DB_PASS || 'root';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
});

module.exports = sequelize;
