# 🏆 Gestor Universal de Torneos

> **Trabajo Final  — Tecnicatura Universitaria en Programación a Distancia (TUPaD - UTN)**

Plataforma web liviana, flexible y parametrizable para la creación, administración y seguimiento en tiempo real de competencias deportivas, eSports y juegos de mesa.

---

## 👥 Integrantes del Proyecto
* **Daniela Romero** — Legajo N.º 234
* **Giuliano Scaglioni** — Legajo N.º 5736
* **Repositorio oficial:** [NaD3M-71/gestor-universal-torneos](https://github.com/NaD3M-71/gestor-universal-torneos)

---

## 📌 1. Resumen y Propuesta de Valor

El **Gestor Universal de Torneos** resuelve la necesidad de organizar competencias tanto informales (eventos relámpago de 4 participantes) como estructuradas (ligas institucionales o comunitarias de 20+ equipos).

* **Versatilidad Multidisciplinaria:** Configuración flexible de formatos (Ligas, Brackets, Fase de Grupos) y sistemas de puntuación.
* **Simplicidad sin Fricción:** Cálculo automático de tablas, fixtures y cruces. Los espectadores consultan la información vía enlace público sin necesidad de registrarse.
* **Persistencia e Integridad:** Bloqueo e inmutabilidad de resultados en fases cerradas para evitar alteraciones en el árbol de cruces.

---

## 🛠️ 2. Arquitectura y Stack Tecnológico

El sistema implementa una **Arquitectura Desacoplada (API REST + SPA)** con el patrón **MVC Distribuido**:

* **Frontend (Vista):** React + TypeScript (Single Page Application).
* **Backend (Controlador):** Node.js + Express + TypeScript.
* **Base de Datos (Modelo):** PostgreSQL / Motor Relacional (SQL) con restricciones referenciales en cascada y consultas de agregación optimizadas.
* **Autenticación:** JSON Web Tokens (JWT) para gestión de sesiones de organizadores.
* **DevOps:** Contenerización con Docker & Docker Compose; control de versiones en GitHub.

---

## 🚀 3. Alcance del MVP

### 3.1. Formatos de Torneo Soportados
* **Eliminación Simple:** Un partido por cruce; perdedor eliminado.
* **Eliminación Doble:** Cuadro principal y consolación; requiere dos derrotas para quedar eliminado.
* **Liga Simple / Doble:** Todos contra todos (1 o 2 ruedas).
* **Liguilla + Playoffs:** Todos contra todos y posterior eliminación directa.
* **Fase de Grupos + Eliminatorias:** Grupos pares y cruces entre clasificados.

### 3.2. Sistemas de Puntuación
* **Ganada / Perdida:** Para juegos de mesa o tenis.
* **Fútbol Clásico:** 3 pts victoria, 1 pt empate, 0 pts derrota.
* **Sistema Alternativo:** 2 pts victoria, 1 pt empate, 0 pts derrota.

---

## ⚙️ 4. Reglas de Negocio Clave

* **Tratamiento de Byes (Pase Libre):**
  * *Sin fase previa:* Asignación aleatoria por sorteo para completar la potencia de 2.
  * *Con fase previa (Liguilla/Grupos):* El Bye se asigna por mérito/seeding a los mejores ubicados en la tabla previa.
* **Emparejamiento Cruzado:** En fases tras grupos, el $1^\circ$ de un grupo se cruza con el peor clasificado del grupo opuesto ($1^\circ A \text{ vs } 2^\circ B$).
* **Inmutabilidad por Fases:** Una vez confirmado el avance de fase, la fase previa queda en modo lectura/bloqueada.

---

## 💻 5. Instalación y Ejecución Local

Requisitos Previos:

  * Node.js (versión 18.x o superior)
  * Docker Desktop & Docker Compose
  * Git

```bash
# 1. Clonar el repositorio
git clone [https://github.com/NaD3M-71/gestor-universal-torneos.git](https://github.com/NaD3M-71/gestor-universal-torneos.git)
cd gestor-universal-torneos

# 2. Levantar los contenedores
docker-compose up --build -d