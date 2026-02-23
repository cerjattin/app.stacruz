export function SettingsPage() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const apiMode = (import.meta.env.VITE_API_MODE || "api").toLowerCase();
  const authMode = (import.meta.env.VITE_AUTH_MODE || "api").toLowerCase();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Configuración</h2>
        <p className="mt-1 text-sm text-slate-600">Variables del entorno (frontend). Se editan en el archivo .env.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <KV label="VITE_API_URL" value={apiUrl} />
          <KV label="VITE_API_MODE" value={apiMode} />
          <KV label="VITE_AUTH_MODE" value={authMode} />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold">Modo recomendado</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Desarrollo sin backend: <span className="font-mono">VITE_API_MODE=mock</span> y <span className="font-mono">VITE_AUTH_MODE=mock</span>
            </li>
            <li>
              Integración real: <span className="font-mono">VITE_API_MODE=api</span> y <span className="font-mono">VITE_AUTH_MODE=api</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 break-all font-mono text-xs text-slate-900">{value}</div>
    </div>
  );
}
