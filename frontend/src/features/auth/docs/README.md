# Documentación del Módulo de Autenticación (`features/auth`)

Este módulo encapsula toda la lógica de negocio, servicios, estados y vistas relacionados con la autenticación de usuarios de la aplicación.

## 1. Arquitectura del Módulo

```text
features/auth/
├── components/       # Componentes visuales específicos del módulo (Forms de login/registro)
├── context/          # Contexto global de autenticación (React Context)
├── docs/             # Documentación técnica del módulo 
├── hooks/            # Hooks personalizados 
├── services/         # Llamadas HTTP a la API (Axios)
├── views/            # Vistas principales (LoginView, RegisterView)
└── index.ts          # Archivo para exportar lo público del módulo
```

## 2. Componentes Clave del Módulo

### A. Tipos (types/)
    Define las estructuras de datos y contratos en TypeScript para los usuarios, payloads de login/registro y respuestas de la API.

### B. Servicio (services/)
    Encargado de comunicarse con los endpoints del backend:

    Peticiones de inicio de sesión (login)
    Registro de nuevos usuarios (register)
    Cierre de sesión (logout)
    Verificación de la sesión actual (usuarioActual / /api/auth/me)

### C. Contexto y Hooks (context/ y hooks/)
    context/: Provee el estado global de la sesión (user, isLoading, etc.) utilizando React Context.

    hooks/: Expone hooks personalizados (como useAuth) para consumir el contexto de forma limpia en toda la aplicación de manera desacoplada.

### D. Vistas (views/)
    Contiene las páginas o pantallas completas asociadas a la autenticación (por ejemplo, el formulario de inicio de sesión y registro).

### E. Archivo index.ts
    Facilita la importación limpia desde otros módulos de la app, exportando únicamente los elementos públicos (como hooks, vistas o tipos necesarios).