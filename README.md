# Proyecto base: GitHub Pages + autenticación con SQLite

## Importante
GitHub Pages **no puede ejecutar** SQLite ni código backend porque publica sitios **estáticos**. Por eso este proyecto está dividido así:

- `frontend/` → se publica en **GitHub Pages**
- `backend/` → se publica en **Render, Railway, Fly.io, VPS o cPanel con Node**
- `backend/data/auth.db` → base de datos SQLite

## Estructura

```text
github-pages-sqlite-auth/
├── frontend/
│   └── index.html
├── backend/
│   ├── data/
│   │   └── auth.db
│   ├── .env.example
│   ├── init-db.js
│   ├── package.json
│   └── server.js
└── README.md
```

## 1) Probar localmente

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run init-db
npm start
```

La API quedará en:

```text
http://localhost:3000
```

### Frontend
Abre `frontend/index.html` en el navegador.

En el campo **URL del backend**, usa:

```text
http://localhost:3000
```

## 2) Publicar el frontend en GitHub Pages
Sube el contenido de `frontend/` a tu repositorio.

Después activa GitHub Pages desde:
- **Settings**
- **Pages**
- selecciona la rama y carpeta a publicar

## 3) Publicar el backend
Puedes subir `backend/` a:
- Render
- Railway
- Fly.io
- VPS
- cPanel con Node.js

## 4) Configurar variables de entorno en producción
Ejemplo:

```env
PORT=3000
JWT_SECRET=una_clave_muy_segura_y_larga
ALLOWED_ORIGIN=https://TU-USUARIO.github.io
DB_PATH=./data/auth.db
```

## 5) Endpoints disponibles

### Registro
`POST /api/register`

```json
{
  "name": "Juan",
  "email": "juan@correo.com",
  "password": "123456"
}
```

### Login
`POST /api/login`

```json
{
  "email": "juan@correo.com",
  "password": "123456"
}
```

### Perfil autenticado
`GET /api/me`

Header:

```text
Authorization: Bearer TU_TOKEN
```

## Recomendaciones
- Para producción real, usa HTTPS.
- Para apps sensibles, conviene migrar el token a cookies seguras HttpOnly.
- SQLite funciona muy bien para proyectos pequeños y medianos con baja concurrencia.
