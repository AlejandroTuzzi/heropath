# Despliegue de HeroPath en un VPS (Ubuntu + Docker)

Guía paso a paso. Ejecuta los bloques en tu sesión SSH (`ssh root@178.104.250.110`).
Dominio: `heropath.tuzzi.ai` · IP del VPS: `178.104.250.110`.

---

## 0) DNS (hazlo primero, tarda en propagar)
En el panel de tu DNS, crea un registro **A**:
```
heropath.tuzzi.ai  →  178.104.250.110   (A, sin proxy)
```
Comprueba la propagación: `ping heropath.tuzzi.ai` debe devolver esa IP.

---

## 1) Preparar el servidor (una sola vez)
```bash
apt update && apt upgrade -y

# Docker + plugin de compose
curl -fsSL https://get.docker.com | sh

# Nginx + certbot (para SSL)
apt install -y nginx certbot python3-certbot-nginx git

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

## 2) Clonar el proyecto
```bash
mkdir -p /opt && cd /opt
git clone https://github.com/AlejandroTuzzi/heropath.git
cd heropath
```

## 3) Crear el `.env` de producción
```bash
cp .env.production.example .env
nano .env   # rellena: POSTGRES_PASSWORD (la misma en DATABASE_URL), APP_PASSWORD,
            # OPENAI_API_KEY, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL=noreply@tuzzi.ai
```
> El `.env` y las claves **no** están en git: se crean aquí a mano.

## 4) Levantar la app (Postgres + Redis + app + worker)
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps          # los 4 servicios "Up"
docker compose -f docker-compose.prod.yml logs -f app  # Ctrl+C para salir
```
La app queda escuchando en `127.0.0.1:3000` (no expuesta directamente).

## 5) Nginx como puerta de entrada
```bash
cp deploy/nginx-heropath.conf /etc/nginx/sites-available/heropath
ln -s /etc/nginx/sites-available/heropath /etc/nginx/sites-enabled/heropath
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 6) SSL (HTTPS) con Let's Encrypt
```bash
certbot --nginx -d heropath.tuzzi.ai
# Te pedirá un email y aceptar términos. Elige redirigir HTTP → HTTPS.
```

## 7) Probar
- Abre `https://heropath.tuzzi.ai` → debe cargar el login.
- Entra con tu `APP_PASSWORD`.
- En **Setup**, usa **"Enviar correo de prueba"** para confirmar SendGrid.

---

## Actualizar a una nueva versión (cuando cambiemos algo)
```bash
cd /opt/heropath
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
Las migraciones de base de datos se aplican solas al arrancar el contenedor `app`
(`prisma migrate deploy`).

## Comandos útiles
```bash
# Ver logs del worker de correos
docker compose -f docker-compose.prod.yml logs -f worker

# Reiniciar todo
docker compose -f docker-compose.prod.yml restart

# Backup de la base de datos
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres heropath > backup_$(date +%F).sql
```

## Notas
- Postgres y Redis guardan datos en volúmenes Docker (`pgdata`, `redisdata`) → persisten entre reinicios.
- El worker de correos corre como su propio contenedor (no hay que arrancarlo aparte).
- Renovación SSL: certbot instala un timer automático; no hay que hacer nada.
