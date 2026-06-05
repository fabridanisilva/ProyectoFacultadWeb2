// app.js
const express = require('express');
const path = require('path');
const pool = require('./db/database'); 
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const app = express();

// configuración de pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// configuración de la sesión
app.use(session({
    secret: 'mi_secreto_super_seguro', 
    resave: false,
    saveUninitialized: false
}));

// esto es para pasar los datos del usuario a todas las vistas Pug y que no se olvide que iniciamos secion en cada vista o pagina
app.use((req, res, next) => {
    res.locals.usuarioActual = req.session.user;
    next();
});


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


// con esto se va a mostrar el formulario
app.get('/registro', (req, res) => {
    res.render('register', { title: 'Registro - Proyect' });
});

// esto es para procesar el registro 
app.post('/registro', async (req, res) => {
    // obtenemos o guardamos los datos que vienen del formulario
    const { username, email, password, password2 } = req.body;

    if (password !== password2) {
        return res.status(400).send('<h1>Error: Las contraseñas no coinciden.</h1><a href="/registro">Volver al registro</a>');
    }
    try {
        // este es elnivel de seguridad del encriptado
        const saltRounds = 10;
        // hasheamos la contraseña
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // guardamos el usuario en la base de datos con la contraseña encriptada
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );

        // si todo sale bien, lo mandamos al inicio
        console.log(`Nuevo usuario registrado: ${username}`);
        res.redirect('/');
        
    } catch (err) {
        console.error(err);
        //capturamos excepciones 
        if (err.code === '23505') {
            res.status(400).send('<h1>Error: El nombre de usuario o el correo ya están en uso.</h1><a href="/registro">Volver</a>');
        } else {
            res.status(500).send('Error interno del servidor al registrar el usuario.');
        }
    }
});


// con esto mostramos el login o inicio de secion
app.get('/login', (req, res) => {
    res.render('login', { title: 'Iniciar Sesión - Proyect' });
});

// procesamos el login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // buscamos al usuario en la base de datos
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).send('<h1>Error: Usuario no encontrado.</h1><a href="/login">Volver</a>');
        }

        const user = result.rows[0];

        // comparamos la contraseña ingresadas
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
            return res.status(401).send('<h1>Error: Contraseña incorrecta.</h1><a href="/login">Volver</a>');
        }

        // si todo está bien, guardamos al usuario en la sesión
        req.session.user = {
            username: user.username
        };

        console.log(`Sesión iniciada: ${user.username}`);
        res.redirect('/');
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Error interno del servidor al iniciar sesión.');
    }
});

// cerramos la seciuon
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});


// esto es para mostrar formulario para crear publicación 
app.get('/publicaciones/nueva', (req, res) => {
    // si no hay usuario en sesión, le bloqueamos el paso
    if (!req.session.user) {
        return res.status(403).send('<h1>Acceso denegado</h1><p>Debes iniciar sesión para crear una publicación.</p><a href="/login">Ir a Login</a>');
    }
    
    // Si está conectado, le mostramos el formulario
    res.render('create-post', { title: 'Nueva Publicación - ProyectoWeb' });
});