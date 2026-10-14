//TODO check que es sequaize CLI


// CLI (Command Line Interface o Interfaz de Línea de Comandos) 
//Prisma y de Sequelize son herramientas de terminal que te permiten administrar tu base de datos, crear y ejecutar migraciones, y automatizar tareas de desarrollo en proyectos de Node.js y TypeScript.

// La Prisma CLI es el motor de comandos de Prisma ORM. Se utiliza principalmente para gestionar el esquema de la base de datos, generar el cliente tipado y aplicar migraciones.
// • npx prisma init: Crea la estructura inicial del proyecto y genera el archivo schema.prisma junto con el archivo de variables de entorno .env.
// • npx prisma generate: Lee tu schema.prisma y genera (o actualiza) el Prisma Client, que es la librería tipada que usas en tu código para hacer consultas.
// • npx prisma migrate dev: Crea una nueva migración SQL basada en los cambios que hiciste en tu esquema y la ejecuta directamente en tu base de datos de desarrollo.
// • npx prisma studio: Abre una interfaz gráfica web local para visualizar y editar los datos de tu base de datos en tiempo real.
// • npx prisma db pull: Conecta a una base de datos existente y "reinspecciona" las tablas para escribir automáticamente el código en tu schema.prisma (introspección)