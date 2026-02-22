export default function App() {
  const tickets = [
    { mesa: "12", mesero: "Carlos", pedido: "10452", comanda: "000231", estado: "PENDIENTE", hora: "12:14" },
    { mesa: "7", mesero: "Laura", pedido: "10453", comanda: "000232", estado: "EN_PREPARACION", hora: "12:16" },
    { mesa: "2", mesero: "Andrés", pedido: "10454", comanda: "000233", estado: "LISTO", hora: "12:18" },
  ];

  const pill = (estado: string) => {
    const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";
    if (estado === "PENDIENTE") return `${base} bg-amber-100 text-amber-800`;
    if (estado === "EN_PREPARACION") return `${base} bg-blue-100 text-blue-800`;
    if (estado === "LISTO") return `${base} bg-emerald-100 text-emerald-800`;
    return `${base} bg-slate-100 text-slate-700`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Comandas</h1>
          <p className="mt-1 text-sm text-slate-600">Zeus/SIESA · Actualización cada 5 min</p>
        </div>

        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
          Sincronizar ahora
        </button>
      </header>

      <section className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((t) => (
          <button
            key={t.comanda}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">Mesa</div>
                <div className="text-2xl font-bold">#{t.mesa}</div>
              </div>
              <span className={pill(t.estado)}>{t.estado}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Mesero</div>
                <div className="font-semibold text-slate-900">{t.mesero}</div>
              </div>
              <div>
                <div className="text-slate-500">Hora pedido</div>
                <div className="font-semibold text-slate-900">{t.hora}</div>
              </div>

              <div>
                <div className="text-slate-500">No. Pedido</div>
                <div className="font-semibold text-slate-900">{t.pedido}</div>
              </div>
              <div>
                <div className="text-slate-500">No. Comanda</div>
                <div className="font-semibold text-slate-900">{t.comanda}</div>
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}