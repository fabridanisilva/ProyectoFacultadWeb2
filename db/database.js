// db/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Creamos un "Pool" de conexiones para que no tengamos que abrir y cerrar
// una conexión nueva por cada consulta que hagamos
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// probamos la conexión solo para ver si funciona
pool.connect()
    .then(() => console.log('Conexión exitosa a postgreSQL (ProyectoWeb)'))
    .catch(err => console.error('Error al conectar a la base de datos', err.stack));

module.exports = pool;