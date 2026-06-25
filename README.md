# HeroPath 🏹

**HeroPath** es una app de *growth* personal para definir hacia dónde quieres ir, qué quieres dejar atrás, y avanzar con metas concretas que se siguen día a día — con una IA que te aconseja y un sistema de puntaje que premia la constancia.

La idea de fondo: *"si apuntas a la luna con una flecha, nunca le darás, pero serás el mejor arquero de la Tierra"*. Tus grandes anhelos no se "completan": orientan el esfuerzo de toda una vida. Las metas del día a día son los disparos que te van convirtiendo en ese arquero.

---

## 🧭 Conceptos

HeroPath gira en torno a tres ideas:

### 🎯 Ambiciones (aspiraciones)
Metas **utópicas e inalcanzables** que funcionan como brújula. No se cumplen del todo; te dan dirección.
*Ej: "Ser un atleta de élite", "Ser maestro del foco".*
Al crearlas, la IA genera una pequeña guía de cómo acercarte a ellas.

### 💢 Falencias
Defectos o malos hábitos que quieres **eliminar** de tu vida.
*Ej: "Sedentarismo", "Desordenado", "Malos hábitos de sueño".*
Al crearlas, la IA genera una guía de cómo combatirlas.

### ✅ Metas (Hero Goals)
Objetivos **alcanzables y con fecha** que te acercan a tus ambiciones y/o combaten tus falencias. Cuando creas una meta, **la IA decide por su criterio** a qué ambiciones impulsa y qué falencias combate (hasta 2 de cada una), te explica por qué, y te deja consejos para lograrla.

Cada meta elige **qué días de la semana** aplica y es de uno de dos tipos:

| Tipo | Cómo puntúa |
|------|-------------|
| **Estricta** | Día a día. Empieza en 100%. Cumplí **+1**, A medias **+0.5**, Excepción **0**, Fallé **−(nº de día programado)**. Fallar duele más cuanto más has avanzado: si fallas en la 16ª vez programada, **−16**. |
| **Rigurosa** | Promedio **semanal**. Defines un objetivo (ej: 3×/semana). Si en la semana llegas al objetivo **+1%**, si no **−1%**. |

En el informe diario marcas, por cada meta: **Cumplí** (verde), **A medias** (amarillo), **Fallé** (rojo) o **Excepción** (cian, = 0%, para cuando algo externo te lo impide, ej. "el gym no abrió").

### 🕯️ Influencias
Personas cercanas que afectan emocionalmente tu camino, en dos tipos:
- **🌑 Sombras** — dudan, critican o recuerdan tus fracasos. Su duda se transforma en disciplina ("¿hoy le das la razón?").
- **🔥 Antorchas** — creen en ti y ven tu potencial. Su confianza se vuelve impulso.

La IA genera mensajes breves y épicos que conectan a esa persona con tus metas/ambiciones. Aparecen en un bloque rotativo en la página de **Metas** y, de vez en cuando, dentro del mensaje diario (Sombra si vienes fallando, Antorcha si vienes bien). Al crear una meta, la IA también genera mensajes específicos para esa meta.

---

## 🤖 El rol de la IA

Una sola llamada por evento (para ahorrar tokens). La IA:
- Genera la **guía** de cada ambición y cada falencia al crearlas.
- Al crear una meta: elige y **explica los vínculos** con ambiciones/falencias + da **consejos** para lograrla.
- Al cerrar el día: da **un mensaje combinado** (felicitación / ánimo según cómo te fue), que queda en tu **registro histórico**.

> La clave de OpenAI se lee desde `openai_config.json` (campo `api_key`) o de `OPENAI_API_KEY` en `.env`.

---

## 🗂️ Secciones de la app

- **Inicio** — login con contraseña maestra.
- **Ambiciones** — crear/gestionar tus aspiraciones utópicas.
- **Falencias** — crear/gestionar lo que quieres eliminar.
- **Influencias** — registrar Sombras y Antorchas; la IA genera sus mensajes.
- **Metas** — tus Hero Goals; crear, abrir y editar. Arriba, un bloque rotativo de Influencias.
- **Calendario** — vista mensual con un punto de color por meta y día; clic en un día para informar.
- **Progreso** — score global, gráficas de evolución por meta, pendientes de informar e historial de mensajes de la IA.
- **Perfil** — foto, nombre, fecha de nacimiento (la edad se deduce), país y zona horaria.
- **Setup** — configuración **global** de horarios: hora del correo de motivación (mañana) y del de cierre (noche).

### Correos (2, no 3)
- **Mañana:** correo de motivación con tus metas y un consejo.
- **Noche:** correo que te invita, mediante un enlace, a registrar tu resultado del día.

El ánimo al fallar / la felicitación **no** es un tercer correo: se da dentro de la app al momento de informar.

---

## 🛠️ Stack

- **Next.js 14** (Pages Router) + **TypeScript**
- **Prisma** + **PostgreSQL**
- **Redis** + **BullMQ** (jobs de correos)
- **SendGrid** (envío de correos)
- **OpenAI** (`gpt-4o-mini`)
- **Recharts** (gráficas) · **dayjs** (fechas)

La base de datos y Redis corren como contenedores Docker: **`heropath-db`** (Postgres, :5432) y **`heropath-redis`** (:6379).

---

## ▶️ Cómo correrlo en local

> Requisitos: Node.js 18+, Docker Desktop, y `openai_config.json` en la raíz.

```bash
# 1. Variables de entorno
cp .env.example .env   # edita DATABASE_URL, REDIS_URL, APP_PASSWORD, etc.

# 2. Levantar Postgres + Redis (Docker Desktop debe estar abierto)
docker start heropath-db heropath-redis
#   (la primera vez se crean con docker-compose up -d)

# 3. Dependencias + base de datos
npm install
npm run prisma:generate
npm run prisma:migrate

# 4. App
npm run dev          # http://localhost:3000

# 5. (Opcional) Worker de correos en otra terminal
npm run worker
```

Contraseña maestra por defecto: la que pongas en `APP_PASSWORD` (.env).

### ⚠️ Dos gotchas en Windows
1. **Si no puedes iniciar sesión / aparecen errores 500:** casi siempre es que **Docker Desktop está cerrado** y la base no responde. Abre Docker y `docker start heropath-db heropath-redis`. (Los contenedores ya tienen `--restart unless-stopped`.)
2. **`prisma generate` falla con EPERM:** detén el `npm run dev` antes de regenerar el cliente; el servidor mantiene bloqueado el motor de Prisma.

---

## 📦 Variables de entorno (.env)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/heropath
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_BASE_URL=http://localhost:3000
APP_PASSWORD=tu_contraseña_maestra
OPENAI_CONFIG_FILE=./openai_config.json
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@heropath.tuzzi.ai
```

---

## 🧩 Estructura

```
src/
├── pages/
│   ├── index.tsx              # login
│   ├── aspirations.tsx        # ambiciones
│   ├── shortcomings.tsx       # falencias
│   ├── dashboard.tsx          # metas
│   ├── create-goal.tsx        # crear meta
│   ├── goal/[id].tsx          # detalle/edición de meta + calendario por meses
│   ├── calendar.tsx           # calendario mensual global
│   ├── progreso.tsx           # score + gráficas + pendientes + historial
│   ├── update-results.tsx     # informe diario
│   ├── profile.tsx · setup.tsx
│   └── api/                   # endpoints (users, goals, aspirations, shortcomings, feedback, ...)
├── lib/
│   ├── prisma.ts · openai.ts · email.ts · jobs.ts
│   └── scoring.ts             # motor de puntaje (estricta/rigurosa, pendientes, series)
└── styles/globals.css         # tema oscuro, colores institucionales
prisma/schema.prisma           # modelo de datos
```

---

## 🚧 Estado y pendientes

- ✅ Ambiciones, falencias y metas con IA · tipos estricta/rigurosa · días de la semana · excepción
- ✅ Calendario (global y por meses) · Progreso con gráficas · score global y por meta
- ✅ Pendientes de informar · historial de mensajes de la IA
- ✅ **Correos:** worker que revisa cada 5 min y envía los 2 correos según la hora local de cada usuario (zona horaria + deduplicado por día). Botón "enviar correo de prueba" en Setup. **Solo falta** poner `SENDGRID_API_KEY` y un remitente verificado.
- ⏳ Despliegue en `heropath.tuzzi.ai` (Nginx → :3000, y `npm run worker` como proceso aparte).

---

*Hecho con ❤️ para convertir grandes anhelos en pasos diarios.*