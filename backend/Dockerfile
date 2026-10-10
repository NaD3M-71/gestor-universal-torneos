Dockerfile
# Usamos una imagen liviana oficial de Node.js 20 sobre Alpine Linux
FROM node:20-alpine

# Habilitamos pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero los archivos de dependencias para aprovechar el caché de Docker
COPY package.json pnpm-lock.yaml* ./

# Instalamos las dependencias
RUN pnpm install

# Copiamos todo el resto del código fuente del backend
COPY . .

# Exponemos el puerto del servidor Express
EXPOSE 3000

# Comando para iniciar el entorno de desarrollo
CMD ["pnpm", "dev"]