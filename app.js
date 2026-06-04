// app.js
const express = require('express');
const path = require('path');
const pool = require('./db/database'); 
require('dotenv').config();

const app = express();

// configuración de pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// esto es una prueba para ver si funciona la conexion a bd
app.get('/', async (req, res) => {
    try {
        
        const result = await pool.query('SELECT NOW()');
        // aca vamos a usar res.render para la vista index.pug
        // y tambien le pasamos las variables title y time
        res.render('index', { 
            title: 'Inicio - Proyect',
            time: result.rows[0].now 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al realizar la consulta en la base de datos.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});