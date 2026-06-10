require('dotenv').config();
const pool = require('./db/database'); 

const crearTablas = async () => {
    const sql = `
    CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255),
        password VARCHAR(255) NOT NULL
    );

    
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

    CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ratings (
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
        PRIMARY KEY (post_id, username)
    );

    CREATE TABLE IF NOT EXISTS followers (
        follower_username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
        following_username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
        PRIMARY KEY (follower_username, following_username)
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
        sender_username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

    try {
        console.log('Iniciando la creación de tablas en la base de datos...');
        await pool.query(sql);
        console.log('Base de datos inicializada correctamente.');
        process.exit(0); 
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err);
        process.exit(1);
    }
};

crearTablas();