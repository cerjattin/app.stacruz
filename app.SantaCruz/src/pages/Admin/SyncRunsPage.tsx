import { useState } from "react";
import { SyncButton } from "../../components/SyncButton";
import * as ticketsService from "../../services/ticketsService";

export function SyncRunsPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSync() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await ticketsService.runSync();
      setMsg(`Sync OK · nuevos: ${r.new_tickets} · actualizados: ${r.updated_tickets} · errores: ${r.errors}`);
    } catch (err: any) {
      setMsg(err?.message || "No fue posible sincronizar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Sincronización con Zeus/SIESA</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aquí podrás ver historial de sincronizaciones y errores. Por ahora dejamos el botón manual para validar conectividad.
        </p>
        <div className="mt-4">
          <SyncButton busy={busy} onClick={onSync} />
        </div>
      </div>

      {msg && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">{msg}</div>}

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Cuando el backend exponga <span className="font-mono">GET /sync/status</span> y/o <span className="font-mono">GET /sync/runs</span>,
        aquí mostraremos tabla con: fecha, modo, nuevos, actualizados, errores y detalle.
      </div>
    </div>
  );
}
