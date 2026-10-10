# Usamos Node.js 20 sobre Alpine Linux
FROM node:20-alpine

# Habilitamos pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Directorio de trabajo
WORKDIR /app

# Copiamos archivos de dependencias
COPY package.json pnpm-lock.yaml* ./

# Instalamos dependencias
RUN pnpm install

# Copiamos el código fuente del frontend
COPY . .

# Exponemos el puerto predeterminado de Vite
EXPOSE 5173

# Ejecutamos Vite configurando el host para aceptar peticiones desde el contenedor
CMD ["pnpm", "run", "dev", "--host"]