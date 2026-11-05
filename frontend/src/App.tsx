import { useEffect, useState } from 'react';
import { API_URL, axiosClient } from './shared/api/axiosClient';

export default function App() {
  const [apiStatus, setApiStatus] = useState<string>('Probando conexión Axios...');

  useEffect(() => {
    // Prueba simple con el cliente de Axios contra la ruta de salud del backend
    axiosClient
      .get('/health')
      .then((res) => {
        setApiStatus(`Respuesta del servidor: ${res.status} OK`);
      })
      .catch((err) => {
        // En esta etapa es normal que falle si el backend no está corriendo,
        // pero valida que Axios intentó la llamada sin explotar.
        setApiStatus(`Axios configurado (sin backend activo): ${err.message}`);
      });
  }, []);

  return (
    <div className="min-h-screen bg-grafito text-white flex flex-col items-center justify-center p-6">
      {/* Tarjeta contenedora usando la paleta */}
      <div className="bg-slate-800 border-2 border-azulAcero rounded-xl shadow-2xl p-8 max-w-lg w-full text-center">
        
        {/* Logo del proyecto */}
        <div className="flex justify-center mb-4">
          <img 
            src="/logo-transparente.png" 
            alt="Gestor Universal de Torneos Logo" 
            className="w-32 h-32 object-contain drop-shadow-md"
          />
        </div>

        <h1 className="text-3xl font-bold text-dorado mb-2">
          Gestor Universal de Torneos
        </h1>
        <p className="text-gray-300 mb-6 text-sm">
          Setup Inicial y Verificación de Entorno (Rama: <span className="text-azulAcero font-mono">feature/frontend-setup</span>)
        </p>

        {/* Sección de verificación de Tailwind */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Prueba de Paleta Tailwind
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <div className="bg-grafito text-white p-3 rounded border border-gray-600">
              Grafito Oscuro (#212529)
            </div>
            <div className="bg-azulAcero text-white p-3 rounded">
              Azul Acero (#457B9D)
            </div>
            <div className="bg-dorado text-grafito p-3 rounded font-bold">
              Dorado (#E9C46A)
            </div>
            <div className="bg-verdeVictoria text-white p-3 rounded">
              Verde Victoria (#2A9D8F)
            </div>
          </div>
        </div>

        {/* Sección de verificación de Axios y Env Vars */}
        <div className="bg-gray-900 p-4 rounded-lg text-left text-xs font-mono space-y-2 border border-gray-700">
          <p className="text-gray-400">// Estado del Cliente HTTP (Axios):</p>
          <p className="text-verdeVictoria">{apiStatus}</p>

          <p className="text-gray-400 mt-2">// URL base de la API (VITE_API_URL):</p>
          <p className="text-azulAcero">{API_URL}</p>
        </div>

      </div>
    </div>
  );
}