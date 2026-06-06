// app.js
const express = require('express');
const path = require('path');
const pool = require('./db/database'); 
const bcrypt = require('bcrypt'); // esto es para encriptar
const session = require('express-session'); // para que se mantenga la sesion
const multer = require('multer'); //para subir y guardar fotos
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
        // aca buscamos todas las publicaciones ordenadas por fecha para mostrar lo nuevo primero
        const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
        const posts = result.rows;

        // Le pasamos el arreglo de 'posts' a la vista
        res.render('index', { 
            title: 'Inicio - Proyect',
            posts: posts 
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
    res.render('create-post', { title: 'Nueva Publicación - Proyect' });
});

// esto es la configuración de multer para saber donde se va a guardar la imagen y copmo
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // queremos que se guarde en la carpeta public/uploads
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: function (req, file, cb) {
        
        // esto es clave porque evita que si dos usuarios suben un archivo llamado foto.jpg se sobreescriban
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });
//esto lo que hace es subir una foto que se va a guardar en la carpeta uploads, 
// entonces de ahi tomamos el url y eso lo guardamos en la base de datos. 
// Si subimos la foto directamente en la bd seria muy pesado y mala practica
app.post('/publicaciones/nueva', upload.single('image'), async (req, res) => {
    // Verificamos por seguridad que el usuario tenga sesión
    if (!req.session.user) {
        return res.status(403).send('No autorizado');
    }

    const { title, description } = req.body;
    
    // Multer nos deja la información del archivo guardado en req.file
    if (!req.file) {
        return res.status(400).send('<h1>Error: Debes subir una imagen.</h1><a href="/publicaciones/nueva">Volver</a>');
    }

    // armamos la ruta relativa que vamos a guardar en postgreSQL
    const imageUrl = '/uploads/' + req.file.filename;
    const username = req.session.user.username;

    try {
        
        await pool.query(
            'INSERT INTO posts (username, title, description, image_url) VALUES ($1, $2, $3, $4)',
            [username, title, description, imageUrl]
        );

        console.log(`✅ Publicación creada por ${username}: ${title}`);
        res.redirect('/'); 
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Error interno al guardar la publicación.');
    }
});

// ruta para buscar publicaciones
// cuando escribamos y demos click en buscar el formulario enviará los datos por método GET a la ruta /buscar
app.get('/buscar', async (req, res) => {
    // capturamos lo que el usuario escribió en el input
    const terminoBusqueda = req.query.q;

    try {
        
        // hacemos la consulta a la base de datos
        const result = await pool.query(
            'SELECT * FROM posts WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC',
            [`%${terminoBusqueda}%`]
        );

        
        res.render('index', { 
            title: `Resultados para "${terminoBusqueda}"`,
            posts: result.rows
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al buscar las publicaciones.');
    }
});

// aca vamos a mostrar el detalle de una publicación y sus comentarios
app.get('/publicaciones/:id', async (req, res) => {
    const postId = req.params.id;

    try {
        // buscamos la publicacion
        const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        
        if (postResult.rows.length === 0) {
            return res.status(404).send('Publicación no encontrada');
        }

        // buscamos lo comentarios de esa publicacion
        const commentsResult = await pool.query('SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at DESC', [postId]);

        res.render('post-detail', {
            title: postResult.rows[0].title,
            post: postResult.rows[0],
            comments: commentsResult.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar la publicación.');
    }
});

// aca agregamos un nuevo comentario
app.post('/publicaciones/:id/comentar', async (req, res) => {
    // Verificamos que esté logueado
    if (!req.session.user) {
        return res.status(403).send('Debes iniciar sesión para comentar.');
    }

    const postId = req.params.id;
    const { content } = req.body;
    const username = req.session.user.username;

    try {
        // guardamos el comentario en la base de datos
        await pool.query(
            'INSERT INTO comments (post_id, username, content) VALUES ($1, $2, $3)',
            [postId, username, content]
        );

        // recargamos la misma página para ver el comentario nuevo
        res.redirect(`/publicaciones/${postId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al guardar el comentario.');
    }
});