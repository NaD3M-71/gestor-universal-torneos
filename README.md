# Gestor Universal de Torneos

> **Trabajo Final — Tecnicatura Universitaria en Programación a Distancia (TUPaD - UTN)**

Plataforma web liviana, flexible y parametrizable para la creación, administración y seguimiento en tiempo real de competencias deportivas, eSports y juegos de mesa.

---

## Integrantes del Proyecto

* **Daniela Romero** — Legajo N.º 234
* **Giuliano Scaglioni** — Legajo N.º 5736
* **Repositorio oficial:** [NaD3M-71/gestor-universal-torneos](https://github.com/NaD3M-71/gestor-universal-torneos)
* **Información sobre el proyecto:** [Documentación](https://docs.google.com/document/d/1wcfEi0k6lRXvkXz3U1VIwWug3rMm2PTdA2qAD4PgT-Y/edit?usp=sharing)

---

## 1. Resumen y Propuesta de Valor

El **Gestor Universal de Torneos** resuelve la necesidad de organizar competencias tanto informales (eventos relámpago de 4 participantes) como estructuradas (ligas institucionales o comunitarias de 20+ equipos).

* **Versatilidad Multidisciplinaria:** Configuración flexible de formatos (Ligas, Brackets, Fase de Grupos) y sistemas de puntuación.
* **Simplicidad sin Fricción:** Cálculo automático de tablas, fixtures y cruces. Los espectadores consultan la información vía enlace público sin necesidad de registrarse.
* **Persistencia e Integridad:** Bloqueo e inmutabilidad de resultados en fases cerradas para evitar alteraciones en el árbol de cruces.

Hay dos tipos de usuario: el **organizador**, que crea el torneo y carga los resultados (la aplicación hace el resto), y el **espectador**, que solo visualiza el torneo mediante un enlace público de solo lectura.

---

## 2. Arquitectura y Stack Tecnológico

El sistema implementa una **Arquitectura Desacoplada (API REST + SPA)** con el patrón **MVC Distribuido**:

* **Frontend (Vista):** React + TypeScript (Single Page Application, construida con Vite).
* **Backend (Controlador):** Node.js + Express + TypeScript.
* **Base de Datos (Modelo):** Motor relacional SQL accedido mediante el ORM Prisma, con restricciones referenciales en cascada y consultas de agregación para las tablas de posiciones. La conexión actual del backend utiliza PostgreSQL.
* **Autenticación:** JSON Web Tokens (JWT) y cookies para la gestión de sesiones de organizadores.
* **DevOps:** Contenerización con Docker y Docker Compose; control de versiones en GitHub.

---

## 3. Alcance del MVP

### 3.1. Formatos de Torneo Soportados
* **Eliminación Simple:** Un partido por cruce; perdedor eliminado.
* **Eliminación Doble:** Cada serie se juega a ida y vuelta; el ganador de la serie se define por el resultado global y, en caso de empate, lo resuelve manualmente el organizador.
* **Liga Simple / Doble:** Todos contra todos (1 o 2 ruedas).
* **Liguilla + Playoffs:** Todos contra todos y posterior eliminación directa entre los mejores clasificados.
* **Fase de Grupos + Eliminatorias:** Grupos en cantidad potencia de 2 y cruces entre clasificados.

El formato Suizo es deseable pero no forma parte del MVP.

### 3.2. Sistemas de Puntuación
* **Ganada / Perdida:** Para juegos de mesa o tenis.
* **Fútbol Clásico:** 3 pts victoria, 1 pt empate, 0 pts derrota.
* **Sistema Alternativo:** 2 pts victoria, 1 pt empate, 0 pts derrota.

### 3.3. Fuera del alcance del MVP
* Invitaciones a usuarios registrados para unirse a un equipo.
* Roles de co-organizador o ayudante con permisos delegados.
* Agenda de partidos con fecha y horario.
* Notificaciones automáticas (email o push).
* Comentarios de espectadores registrados.

---

## 4. Reglas de Negocio Clave

* **Ciclo de vida del torneo:** `borrador` (todo editable) → `en_curso` (configuración bloqueada, resultados editables solo en la fase activa) → `finalizado` (solo lectura).
* **Tratamiento de Byes (Pase Libre):**
  * *Sin fase previa:* Asignación aleatoria por sorteo para completar la potencia de 2.
  * *Con fase previa (Liguilla/Grupos):* El Bye se asigna por mérito/seeding a los mejores ubicados en la tabla previa.
* **Emparejamiento Cruzado:** En fases tras grupos, el mejor clasificado de un grupo se cruza con el peor clasificado del grupo opuesto (1°A vs. 2°B y 1°B vs. 2°A).
* **Desempates manuales:** El organizador resuelve los empates relevantes en la línea de corte y puede dejar un comentario que documente el criterio utilizado.
* **Inmutabilidad por Fases:** Una vez confirmado el avance de fase, la fase previa queda en modo lectura/bloqueada.
* **Tabla de posiciones calculada:** PJ, PG, PE, PP y Puntos no se almacenan; se calculan por agregación sobre los enfrentamientos.

---

## 5. Documentación

Toda la documentación técnica está en texto plano (Markdown) dentro de la carpeta [`docs/`](docs):

* [Estructura de la Base de Datos](docs/estructura-bd-gestor-torneos-giuliano-daniela.md): diagrama entidad-relación, diccionario de datos, decisiones de diseño, especificación de formatos y casos de uso.
* [Estructura de Módulos](docs/estructura-de-modulos.md): división funcional del sistema en el módulo de Usuarios / Autenticación y el módulo de Torneos.

La carpeta también conserva las versiones en `.docx` y `.pdf` entregadas anteriormente.

---

## 6. Estructura del Repositorio

```text
gestor-universal-torneos/
├── backend/             API REST (Node.js + Express + TypeScript + Prisma)
│   ├── src/             Código fuente (ver sección 6.1)
│   ├── seeders/         Datos de prueba
│   ├── migrations/
│   └── tests/
├── frontend/            SPA (React + TypeScript + Vite)
├── docs/                Documentación del proyecto
└── docker-compose.yml   Orquestación de backend y frontend
```

### 6.1. Estructura del Backend

El código del backend está organizado en capas, y cada carpeta de `backend/src/` tiene una responsabilidad:

```text
src/
├── server.ts            Arranque: conecta a la base de datos y levanta Express
├── app.ts               Configura Express: middlewares, rutas y manejo de errores
├── config/              Variables de entorno validadas (env.ts)
├── errors/              Errores propios de la aplicación (AppError)
├── routes/              Endpoints de cada módulo; index.ts los monta bajo /api
├── controllers/         Reciben la petición HTTP y arman la respuesta
├── middlewares/         Código que corre entre la petición y el controlador (404 y errores)
├── validators/          Validación de los datos de entrada
├── application/         Casos de uso: coordinan el dominio y los repositorios
├── domain/              Reglas de negocio, sin dependencias de Express ni de la base de datos
│   ├── usuarios/
│   ├── torneos/
│   ├── fixture/         Generación de fixtures y brackets
│   ├── resultados/      Carga de resultados y tablas de posiciones
│   └── shared/
└── infrastructure/      Todo lo que se comunica con el exterior
    ├── database/        Cliente de Prisma y esquema
    ├── repositories/    Acceso a datos
    └── auth/            JWT y manejo de sesiones
```

Flujo de una petición: `routes` → `controllers` → `application` → `domain` e `infrastructure`. Los errores se lanzan con `AppError` y el middleware `middlewares/errorHandler.ts` los convierte en una respuesta JSON con el formato `{ "error": { "mensaje": "..." } }`.

Las rutas de la API cuelgan de `/api`. Por ahora existe `GET /api/health`, que indica si el servidor está levantado.

---

## 7. Instalación y Ejecución Local

Requisitos previos:

* Node.js (versión 20.x recomendada, la misma que usan los contenedores)
* pnpm (backend) y npm o pnpm (frontend)
* Git
* Docker y Docker Compose (opcional)
* Una base de datos accesible mediante la variable `DATABASE_URL`

### 7.1. Clonar el repositorio

```bash
git clone https://github.com/NaD3M-71/gestor-universal-torneos.git
cd gestor-universal-torneos
```

### 7.2. Ejecución con Docker Compose

Definí las variables de entorno necesarias (por ejemplo en un archivo `.env` en la raíz) y levantá los servicios:

```bash
docker compose up --build
```

* Backend: http://localhost:3000
* Frontend: http://localhost:5173

### 7.3. Ejecución manual

Las variables de entorno se definen en un archivo `.env` en la raíz del repositorio, que se crea copiando `.env.example`. Las variables son `DATABASE_URL` (obligatoria), `PORT` (por defecto 3000) y `JWT_SECRET`.

```bash
cp .env.example .env
```

Backend:

```bash
cd backend
pnpm install
pnpm dev
```

Para comprobar que el servidor responde:

```bash
curl http://localhost:3000/api/health
# {"estado":"ok","entorno":"development","uptime":3,"fecha":"..."}
```

Frontend (usa `VITE_API_URL`, por defecto `http://localhost:3000/api`):

```bash
cd frontend
npm install
npm run dev
```

#### Scripts del backend

| Script | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor en modo desarrollo, con recarga automática. |
| `pnpm build` | Compila TypeScript a la carpeta `dist/`. |
| `pnpm start` | Ejecuta la versión compilada (`dist/server.js`). |
| `pnpm typecheck` | Verifica los tipos sin generar archivos. |
| `pnpm db:pull` | Actualiza el esquema de Prisma desde la base de datos. |
| `pnpm db:generate` | Regenera el cliente de Prisma a partir del esquema. |
| `pnpm db:studio` | Abre Prisma Studio para ver y editar datos. |
| `pnpm db:seed` | Carga datos de prueba (borra los datos existentes). |

---

## 8. Estado del Proyecto

El proyecto se encuentra en la etapa inicial de desarrollo: están definidos el modelo de datos, la modularización y las reglas de negocio de todos los formatos del MVP, y la estructura base del backend (conexión a la base de datos, servidor Express con manejo de errores y ruta de salud, y capas por módulo) y del frontend.