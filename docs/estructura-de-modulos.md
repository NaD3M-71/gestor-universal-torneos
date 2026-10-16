# Estructura de Módulos

**Gestor Universal de Torneos**

Giuliano Scaglioni – Daniela Romero

## Introducción

El objetivo de este documento es detallar la modularización inicial del Gestor Universal de Torneos, orientada a garantizar un diseño claro, mantenible y escalable. En la fase actual del desarrollo, el sistema se divide funcionalmente en dos grandes módulos: **Módulo de Usuario** y **Módulo de Torneos (gestión global y dominio)**.

## Definición de Módulos

### Módulo 1: Usuarios / Autenticación

Este módulo abarca el control de acceso, la seguridad y el perfil de los organizadores dentro de la plataforma.

- **Entidades y alcance:** USUARIO.
- **Responsabilidades clave:**
  - Registro, login y autenticación segura de usuarios organizadores (uso de credenciales e integración JWT).
  - Gestión del perfil de usuario (nombre, apellido, email).
  - Control de pertenencia: vinculación como `creador_id` de las competencias para validar permisos de administración.

### Módulo 2: Torneos

Este módulo centraliza la configuración, la estructura competitiva y la ejecución del ciclo de vida de los torneos.

- **Entidades y alcance:** TORNEO, FASE, EQUIPO, INTEGRANTE, ENFRENTAMIENTO.
- **Responsabilidades clave:**
  - **Parametrización y estado:** creación y configuración inicial de competencias (formato, sistema de puntuación, participantes, fases y reglas de desempate).
  - **Generación de fixture y avance:** lógica algorítmica para emparejamientos (Round-Robin, brackets de eliminación directos/dobles, cruces entre grupos) y propagación automática de clasificados.
  - **Registro y reglas de negocio:** carga de resultados, cómputo dinámico de tablas de posiciones, manejo de Byes y cierre/bloqueo inmutable de fases.

> **Nota:** con el crecimiento del sistema y para aplicar el principio de responsabilidad única, se podría plantear a futuro desacoplar el Módulo de Torneos en dos sub-módulos o servicios independientes: un módulo de lógica y creación de torneos (encargado exclusivamente de los algoritmos de generación de fixtures, cálculo de tablas de posiciones, brackets, emparejamientos cruzados y resolución de algoritmos de eliminación) y un módulo de gestión de torneos por el usuario (encargado del ciclo de vida del torneo, permisos del creador, la carga de resultados, carga de datos para espectadores e interfaz de desempates manuales).
