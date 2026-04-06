require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const DB_PATH = process.env.DB_PATH || './data/auth.db';

const resolvedDbPath = path.resolve(__dirname, DB_PATH);
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(resolvedDbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN,
  credentials: false
}));

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API funcionando', db: path.basename(resolvedDbPath) });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nombre, correo y contraseña son obligatorios.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), String(email).trim().toLowerCase(), passwordHash],
      function (error) {
        if (error) {
          if (String(error.message).includes('UNIQUE')) {
            return res.status(409).json({ message: 'Ese correo ya está registrado.' });
          }
          return res.status(500).json({ message: 'No se pudo crear el usuario.' });
        }

        return res.status(201).json({
          message: 'Usuario creado correctamente.',
          user: {
            id: this.lastID,
            name: name.trim(),
            email: String(email).trim().toLowerCase()
          }
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: 'Error interno al registrar.' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  }

  db.get(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?',
    [String(email).trim().toLowerCase()],
    async (error, user) => {
      if (error) {
        return res.status(500).json({ message: 'Error al consultar el usuario.' });
      }

      if (!user) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      const token = signToken(user);
      return res.json({
        message: 'Inicio de sesión correcto.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at
        }
      });
    }
  );
});

app.get('/api/me', authMiddleware, (req, res) => {
  db.get(
    'SELECT id, name, email, created_at FROM users WHERE id = ?',
    [req.user.sub],
    (error, user) => {
      if (error) {
        return res.status(500).json({ message: 'Error al consultar el perfil.' });
      }

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      return res.json({ user });
    }
  );
});

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
  console.log(`Base de datos: ${resolvedDbPath}`);
});
