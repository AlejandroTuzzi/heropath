# 🚀 Setup Rápido - HeroPath Local

Para ejecutar HeroPath localmente en tu máquina, necesitas:
1. **PostgreSQL** (base de datos)
2. **Redis** (caché y job queue)
3. **Node.js** (ya instalado)

---

## Opción 1: Usar Docker (Recomendado)

Esto es lo más fácil si tienes Docker instalado.

### Instalar Docker Desktop
- Descargar desde: https://www.docker.com/products/docker-desktop

### Levantar PostgreSQL + Redis
```powershell
# Terminal 1: PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name heropath-db postgres:15

# Terminal 2: Redis
docker run -d -p 6379:6379 --name heropath-redis redis:7
```

### Verificar que están corriendo
```powershell
docker ps
# Deberías ver heropath-db y heropath-redis
```

### Iniciar la app
```powershell
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### En otra terminal, iniciar el worker
```powershell
npm run worker
```

---

## Opción 2: Instalar localmente en Windows

### PostgreSQL
1. Descargar: https://www.postgresql.org/download/windows/
2. Instalar con contraseña `postgres` (como en .env)
3. En PowerShell, verificar:
   ```powershell
   psql -U postgres -h localhost -c "SELECT version();"
   ```

### Redis
1. Descargar: https://github.com/microsoftarchive/redis/releases
   - Descarga el archivo `.msi` más reciente
2. Instalar con opciones por defecto
3. Verificar en PowerShell:
   ```powershell
   redis-cli ping
   # Debería responder: PONG
   ```

### Crear base de datos
```powershell
psql -U postgres -h localhost
# En el prompt psql:
CREATE DATABASE heropath;
\q
```

### Iniciar la app
```powershell
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### En otra terminal, iniciar el worker
```powershell
npm run worker
```

---

## Usar Docker Compose (Todo en uno)

Si prefieres todo junto:

```powershell
docker-compose up --build
```

Esto levanta PostgreSQL, Redis y la app automáticamente.

En otra terminal:
```powershell
npm run worker
```

---

## Verificar Setup

```powershell
# Verificar Redis
.\check-deps.ps1

# Si todo está bien, deberías ver:
# ✓ Redis
# ✓ PostgreSQL
```

---

## Troubleshooting

### "Cannot connect to PostgreSQL"
```powershell
# Asegúrate que PostgreSQL está corriendo
Get-Process postgres  # Si nada, PostgreSQL no está ejecutándose

# Si usas Docker, verifica:
docker logs heropath-db
```

### "Cannot connect to Redis"
```powershell
# Asegúrate que Redis está corriendo
Get-Process redis-server  # Si nada, Redis no está ejecutándose

# Si usas Docker, verifica:
docker logs heropath-redis

# Prueba conectar manualmente:
redis-cli ping  # Debería responder: PONG
```

### "Prisma migration failed"
```powershell
# Resetear base de datos (elimina todo)
npm run prisma:migrate reset

# Luego reintentar:
npm run prisma:migrate
```

---

## URLs de acceso

- **App:** http://localhost:3000
- **PostgreSQL:** localhost:5432 (usuario: postgres, contraseña: postgres)
- **Redis:** localhost:6379

---

## Credenciales por defecto (.env)

```
APP_PASSWORD=heropathpass      # Para acceder a la app
SENDGRID_API_KEY=              # (opcional, para emails en producción)
```

---

## Próximo paso

1. Levantar Redis y PostgreSQL (Docker o local)
2. Ejecutar `npm run dev`
3. Abrir http://localhost:3000
4. Usar contraseña: `heropathpass`
5. En otra terminal: `npm run worker`

¡Listo! 🎉
