import { Link, useParams } from "react-router-dom";
import { useTicketDetail } from "../../hooks/useTicketDetail";
import { TicketDetailModal } from "../../components/TicketDetailModal";

// Para deep-link: /tickets/:id
// Se reutiliza el modal como vista completa.
export function TicketDetailPage() {
  const { id } = useParams();
  const q = useTicketDetail(id ?? null);

  if (!id) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        ID inválido.
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Cargando…</div>
    );
  }

  if (q.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
        {String((q.error as any)?.message || "Error")}
        <div className="mt-4">
          <Link to="/panel" className="text-sm font-semibold text-slate-900 underline">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  // Render como modal siempre abierto, y el cierre vuelve a panel
  return (
    <TicketDetailModal
      open={true}
      ticket={q.data ?? null}
      onClose={() => (window.location.href = "/panel")}
      onRefresh={() => q.refetch()}
    />
  );
}
