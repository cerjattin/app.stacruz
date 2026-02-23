import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">La ruta que intentas abrir no existe.</p>
        <div className="mt-5">
          <Link
            to="/panel"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Ir al panel
          </Link>
        </div>
      </div>
    </div>
  );
}
