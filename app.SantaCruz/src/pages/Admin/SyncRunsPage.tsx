import { useEffect, useState } from "react";
import type { SyncRun } from "../../lib/types";
import * as ticketsService from "../../services/ticketsService";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function fmtDuration(ms?: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function StatusBadge({ status }: { status: SyncRun["status"] }) {
  const cls =
    status === "SUCCESS"
      ? "bg-lime-100 text-lime-900"
      : status === "ERROR"
        ? "bg-red-100 text-red-900"
        : "bg-amber-100 text-amber-900";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}>
      {status}
    </span>
  );
}

export function SyncRunsPage() {
  const [latest, setLatest] = useState<SyncRun | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [latestRun, allRuns] = await Promise.all([
        ticketsService.getLatestSyncRun(),
        ticketsService.listSyncRuns(50),
      ]);
      setLatest(latestRun);
      setRuns(allRuns);
    } catch (err: any) {
      setError(
        err?.message || "No fue posible cargar el historial de sincronización",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold tracking-wide text-food-wine">
              Última sincronización
            </div>
            <div className="mt-2 text-sm text-stone-600">
              Estado general del último proceso ejecutado contra Zeus / SIESA.
            </div>
          </div>

          <button
            onClick={() => void load()}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-extrabold text-stone-800 shadow-sm hover:bg-stone-50"
          >
            Actualizar
          </button>
        </div>

        {!latest && !loading && !error && (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            Aún no hay corridas registradas.
          </div>
        )}

        {latest && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Card
              label="Estado"
              value={<StatusBadge status={latest.status} />}
            />
            <Card label="Modo" value={latest.mode} />
            <Card label="Inicio" value={fmtDate(latest.started_at)} />
            <Card label="Duración" value={fmtDuration(latest.duration_ms)} />
            <Card
              label="Doctos SQL"
              value={String(latest.total_doctos_sqlserver)}
            />
            <Card label="Tickets nuevos" value={String(latest.new_tickets)} />
            <Card
              label="Tickets actualizados"
              value={String(latest.updated_tickets)}
            />
            <Card label="Items nuevos" value={String(latest.new_items)} />
            <Card
              label="Items actualizados"
              value={String(latest.updated_items)}
            />
            <Card label="Items omitidos" value={String(latest.skipped_items)} />
            <Card
              label="Último last_sync_at"
              value={fmtDate(latest.last_sync_at)}
            />
            <Card
              label="Rowversion"
              value={
                latest.last_rowversion != null
                  ? String(latest.last_rowversion)
                  : "—"
              }
            />
          </div>
        )}

        {latest?.error_message && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {latest.error_message}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-extrabold tracking-wide text-food-wine">
          Historial de sincronización
        </div>

        {loading && (
          <div className="mt-4 text-sm text-stone-600">Cargando historial…</div>
        )}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-600">
                  <th className="px-3 py-2">Inicio</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Modo</th>
                  <th className="px-3 py-2">Doctos</th>
                  <th className="px-3 py-2">T. nuevos</th>
                  <th className="px-3 py-2">T. actualizados</th>
                  <th className="px-3 py-2">I. nuevos</th>
                  <th className="px-3 py-2">I. actualizados</th>
                  <th className="px-3 py-2">Duración</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-stone-100">
                    <td className="px-3 py-2 text-stone-800">
                      {fmtDate(run.started_at)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-3 py-2 text-stone-800">{run.mode}</td>
                    <td className="px-3 py-2 text-stone-800">
                      {run.total_doctos_sqlserver}
                    </td>
                    <td className="px-3 py-2 text-stone-800">
                      {run.new_tickets}
                    </td>
                    <td className="px-3 py-2 text-stone-800">
                      {run.updated_tickets}
                    </td>
                    <td className="px-3 py-2 text-stone-800">
                      {run.new_items}
                    </td>
                    <td className="px-3 py-2 text-stone-800">
                      {run.updated_items}
                    </td>
                    <td className="px-3 py-2 text-stone-800">
                      {fmtDuration(run.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-food-cream p-4">
      <div className="text-xs font-extrabold tracking-wide text-stone-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-stone-900">{value}</div>
    </div>
  );
}
