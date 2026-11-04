# Gestor Universal de Torneos - Frontend 🏆 

Frontend desarrollado en **React** con **TypeScript**, **Vite** y **Tailwind CSS**, estructurado bajo una arquitectura modular por dominios (*feature-based*).

---

## Diseño y Paleta de Colores

La interfaz sigue la identidad visual del proyecto integrada en Tailwind CSS:

| Color | Hex | Uso Principal |
| :--- | :--- | :--- |
| **Grafito Oscuro** | `#212529` | Fondos oscuros, estructuras y textos principales |
| **Azul Acero** | `#457B9D` | Bordes, acentos institucionales y elementos secundarios |
| **Dorado Brillante** | `#E9C46A` | Títulos de jerarquía, coronas, destaques y llamadas a la acción |
| **Verde Victoria** | `#2A9D8F` | Confirmaciones, victorias, inscripciones y éxito |
| **Neutro Claro** | `#F8F9FA` | Fondos de tarjetas claras y modales |
| **Alerta** | `#F4A261` | Partidos empatados y advertencias |
| **Peligro** | `#E76F51` | Partidos perdidos, errores de validación y eliminaciones |

---

## Estructura de Carpetas (Architecture by Features)

```text
src/
├── features/         # Módulos encapsulados por dominio
│   ├── auth/         # Autenticación y control de sesión
│   ├── tournaments/  # Creación, gestión y listado de torneos
│   ├── matches/      # Fixtures, tablas de posiciones, brackets y cierres de fase
│   └── public/       # Vista de solo lectura para espectadores
├── shared/           # Recursos globales reutilizables
│   ├── api/          # Cliente Axios configurado (`axiosClient.ts`)
│   ├── components/   # Componentes UI globales (Layouts, Botones, Navbars)
│   └── utils/        # Helper functions y formateadores
├── App.tsx           # Enrutador principal y layout base
├── index.css         # Importación de Tailwind CSS y tema global
└── main.tsx          # Punto de entrada de la aplicación
```

## Configuración del Cliente HTTP (Axios & Mocks)

El cliente HTTP reside en src/shared/api/axiosClient.ts. Soporta cambio dinámico entre backend real y datos simulados locales mediante variables de entorno en .env:

```text
VITE_API_URL=http://localhost:4000/api
VITE_USE_MOCKS=true
```

## Comandos Principales

### Instalar dependencias
npm install

### Levantar entorno de desarrollo
npm run dev

### Ejecutar tests
npm test

### Compilar para producción
npm run build