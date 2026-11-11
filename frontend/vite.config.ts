import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, './src/features'),
      '@components': path.resolve(__dirname, './src/shared/components'),
      '@axios-client': path.resolve(__dirname, './src/shared/api/axiosClient')
    },
  },
  // Usa el .env de la raíz del repo (el mismo que el backend) en vez de buscar
  // uno dentro de frontend/. Vite solo expone al navegador las variables que
  // empiezan con VITE_, así que DATABASE_URL y JWT_SECRET no se filtran.
  envDir: '..',
  
})
