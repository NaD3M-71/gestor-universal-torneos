import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Usa el .env de la raíz del repo (el mismo que el backend) en vez de buscar
  // uno dentro de frontend/. Vite solo expone al navegador las variables que
  // empiezan con VITE_, así que DATABASE_URL y JWT_SECRET no se filtran.
  envDir: '..',
})
