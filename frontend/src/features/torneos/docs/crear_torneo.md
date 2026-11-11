# Módulo de Creación de Torneos: Documentación Técnica y Funcional

Este documento describe la arquitectura, reglas de negocio, utilidades matemáticas y comportamiento de validación del módulo **Creación de Torneos** en el frontend de la plataforma.

---

## 1. Alcance del Módulo

El objetivo principal de este módulo es permitir al organizador configurar los parámetros iniciales de una competencia de forma intuitiva, visualmente guiada y matemáticamente protegida antes de guardarla en la base de datos en estado de `borrador`.

> **Nota de versión:** Este módulo comprende exclusivamente la **definición y creación estructural del torneo** (`CrearTorneoView`, `useCrearTorneo`, validadores y utilidades asociadas). La gestión y edición de equipos inscritos (`EditarTorneoView`) se encuentra en desarrollo en una rama independiente.

---

## 2. Arquitectura 

Para evitar la creación de un componente masivo e inmanejable ("God Form"), la etapa de preparación de un torneo se divide en tres interfaces/formularios independientes:

```
[ Formulario 1: Creación del Cascarón ] 
       │ (POST /api/torneos) -> Retorna ID y Estado 'borrador'
       ▼
[ Formulario 2: Configuración de Fases y Grupos ]
       │ (PATCH /api/torneos/:id + PUT /api/torneos/:id/grupos)
       ▼
[ Formulario 3: Inscripción de Equipos e Integrantes ]
       │ (POST /api/torneos/:torneoId/equipos)
       ▼
[ Botón de Activación Explicita ] ──► (PATCH /api/torneos/:id/iniciar) ──► Estado 'en_curso'
```

En este módulo se desarrolla la creación del torneo que sigue una separación estricta de responsabilidades:

```
frontend/src/features/torneos/
├── hooks/
│   └── useCrearTorneo.ts         # Orquestación de estado, efectos y envío
├── service/
│   └── torneoService.ts          # Integración HTTP con Axios
├── utils/
│   └── torneoCalculos.ts         # Lógica matemática pura y formateadores de texto
├── validators/
│   └── torneo.ts                 # Esquema de validación estricto en Zod
└── views/
    └── CrearTorneoView.tsx       # Renderizado declarativo y UI accesible
```

### 2.1. Funciones Puras (`torneoCalculos.ts`)
Aísla la lógica matemática independiente de React:
* `esPotenciaDeDos(n: number): boolean`: Verifica mediante operaciones bit a bit (`(n & (n - 1)) === 0`) si el número puede formar una llave de eliminación directa perfecta sin participantes libres.
* `calcularLlaveAsimetrica(equipos: number): InfoLlaveAsimetrica | null`: Determina la potencia de 2 inmediatamente superior ($2^k \ge \text{equipos}$), calculando:
  * **Byes (pases directos):** $2^k - \text{equipos}$
  * **Equipos en ronda preliminar:** $\text{equipos} - \text{Byes}$
  * **Ronda objetivo:** La ronda donde se incorporan los equipos que recibieron bye (por ejemplo, Cuartos de Final).
* `obtenerNombreRonda(equipos: number): string`: Traduce números de clasificados a nombres estándar de competencia deportiva (`la Final`, `Semifinales`, `Cuartos de Final`, `Octavos de Final`, etc.).
* `DESCRIPCIONES_FORMATO`: Diccionario de textos explicativos que se presentan al usuario dinámicamente según la opción elegida.

### 2.2. Validación y Contratos de Datos (`torneo.ts`)
Construido sobre **Zod** y acoplado a React Hook Form mediante `@hookform/resolvers/zod`.
* Regla global: Participantes totales acotados estrictamente entre 2 y 128 equipos (paridad con el backend).
* `superRefine`:
  * En **`grupos_eliminatorias`**: exige que la cantidad de grupos sea potencia de dos (2, 4, 8, 16, 32) y valida que `lineaCorte` (clasificados por grupo) sea menor que `participantesPorGrupo`.
  * En **`liguilla_eliminacion`**: valida que `lineaCorte` (clasificados a playoffs) sea menor a la cantidad total de participantes de la fase regular.

### 2.3. Hook Controlador (`useCrearTorneo.ts`)
* Concentra el formulario mediante `useForm<CrearTorneoForm>`.
* **Efectos automáticos de sincronización (`useEffect`):**
  1. *Total en grupos:* Calcula automáticamente $\text{Total} = \text{Grupos} \times \text{Equipos por Grupo}$ cuando cambian dichos selectores.
  2. *Auto-ajuste de corte en grupos:* Si el organizador reduce la cantidad de equipos por grupo a un número menor o igual que los clasificados actuales, el hook recorta `lineaCorte` automáticamente a `participantesPorGrupo - 1`.
  3. *Auto-ajuste de corte en liguilla:* Si se reducen los participantes de fase regular, ajusta el corte para que no supere el total.
  4. *Fijación de puntuación en eliminatorias:* Al elegir `eliminacion_simple` o `eliminacion_doble`, fija automáticamente el valor `ganada_perdida` para satisfacer las restricciones del backend.
* **Cálculo reactivo con `useMemo` (`resumen`):** Procesa y expone a la vista el número total de clasificados, las alertas de llaves asimétricas y las fechas libres.

### 2.4. Vista (`CrearTorneoView.tsx`)
* Formulario protegido con `noValidate` para suprimir tooltips nativos en inglés del navegador y asegurar que los mensajes de error mantengan el estilo corporativo de la aplicación.
* Panel narrativo `📋 Dinámica del Torneo`: explica en lenguaje natural y por etapas (Fase Regular $\rightarrow$ Playoffs) el recorrido exacto de la competencia, indicando en qué instancia entra cada grupo de equipos.
* Control preventivo en el tipeo (`onInput`) para evitar que el usuario tipee números mayores a los permitidos antes de enviar el formulario.

---

## 3. Comportamiento por Formato de Torneo

| Formato | Inputs Renderizados | Sistema de Puntuación | Lógica Eliminatoria / Playoffs |
| :--- | :--- | :--- | :--- |
| **Liga Simple / Doble** | Cantidad total (2 a 128) | Editable (Fútbol clásico, Alternativo, Ganada/Perdida) | N/A (Se define por tabla de posiciones acumulada). |
| **Eliminación Simple / Doble** | Cantidad total (2 a 128) | Bloqueado en `Ganada / Perdida` (Llave directa) | Si no es potencia de 2, advierte cantidad exacta de Byes y partidos preliminares. |
| **Liguilla + Playoffs** | 1. Equipos Fase Regular<br>2. Clasifican a Playoffs | Editable (aplica a la tabla de la Fase Regular) | Advierte estructura de los playoffs y Byes a la siguiente ronda según la posición final. |
| **Fase de Grupos + Eliminatorias** | 1. Grupos (Potencia de 2)<br>2. Equipos por Grupo<br>3. Clasifican por Grupo | Editable (aplica a las tablas de posiciones por zona) | Calcula clasificados totales ($\text{Grupos} \times \text{Clasifican}$). Advierte fechas libres si los grupos son impares y Byes en el cuadro final. |

---

## 4. Requerimientos de Backend Pendientes

Para que el nuevo parámetro `lineaCorte` persista en base de datos al momento del envío del payload, el backend debe incorporar:

1. **Prisma / Base de Datos:** Agregar `lineaCorte Int?` en el modelo `Torneo`.
2. **`torneo.validator.ts`:**
   ```typescript
   body('lineaCorte')
     .optional({ values: 'null' })
     .isInt({ min: 1 })
     .withMessage('La línea de corte debe ser de al menos 1.')
     .bail()
     .toInt(),
   ```
3. **`torneo.controller.ts`:**
   * Agregar `'lineaCorte'` en `CAMPOS_EDITABLES`.
   * Extraer `lineaCorte` en la función `crear` y pasarla al servicio.
4. **Interfaces de TypeScript:** Añadir `lineaCorte?: number | null` en `DatosNuevoTorneo` y `DatosActualizarTorneo`.

---

## 5. Estrategia de Pruebas

Ubicación: `frontend/src/tests/features/torneos/`
Runner: **Vitest** + **React Testing Library** + **@testing-library/user-event**

* **`torneoCalculos.test.ts` (Tests Unitarios):**
  * Validación de potencias de 2 (incluyendo borde $2^0 = 1$).
  * Cálculo de byes (12 equipos $\rightarrow$ 4 byes hacia Cuartos de Final; 7 equipos $\rightarrow$ 1 bye hacia Semifinales).
  * Conversión de índices a nombres de rondas oficiales.
* **`CrearTorneoForm.test.tsx` (Tests de Integración UI):**
  * Bloqueo de formulario ante nombre vacío.
  * Multiplicación y renderizado dinámico de Fase de Grupos.
  * Renderizado del panel de advertencia ante cuadros asimétricos.
  * Detección y bloqueo visual cuando $\text{Grupos} \times \text{Equipos} > 128$.