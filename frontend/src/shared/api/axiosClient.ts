// Dejamos configurado el cliente base de Axios con la estructura lista para apuntar al backend o alternar con mocks locales

import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

// Interceptor básico de errores o tokens opcional para más adelante
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejo global de errores de red o autenticación
    return Promise.reject(error);
  }
);