import { Link } from "react-router-dom";

export function HomeView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 bg-grafito text-white">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-dorado drop-shadow-lg">
          Forja la Gloria de tus Torneos
        </h1>
        <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed">
          La plataforma definitiva para administrar competencias, gestionar
          equipos y llevar el registro de cada enfrentamiento con precisión
          legendaria.
        </p>

        <div className="flex justify-center space-x-4 pt-4">
          <Link
            to="/registro"
            className="bg-verdeVictoria hover:bg-teal-600 text-grafito font-bold px-8 py-3 rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5"
          >
            Comenzar Ahora
          </Link>
          <Link
            to="/login"
            className="border-2 border-azulAcero text-azulAcero hover:bg-azulAcero hover:text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-colors"
          >
            Ya tengo una cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
