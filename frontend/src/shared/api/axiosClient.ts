import axios from 'axios';

// Cliente HTTP único del frontend. Todas las llamadas a la API pasan por acá.
// La URL base sale de VITE_API_URL (ver .env.example en la raíz del repo).
// Si la variable no está definida, usa el backend local en el puerto 3000.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Necesario para que el navegador envíe y reciba la cookie httpOnly con el JWT.
  withCredentials: true,
});

// Punto único para manejar errores globales (por ejemplo, sesión vencida)
// cuando se implemente la autenticación.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
