import { api } from "../lib/api";
import type { ItemStatus, SyncRun, SyncRunResult, TicketDetail, TicketStatus } from "../lib/types";
import { mockGetTicket, mockListTickets } from "../mocks/tickets";

const API_MODE = (import.meta.env.VITE_API_MODE || "api").toLowerCase();

export async function listTickets(params?: { status?: TicketStatus; q?: string }): Promise<TicketDetail[]> {
  if (API_MODE === "mock") return mockListTickets(params);
  const res = await api.get<TicketDetail[]>("/tickets", { params });
  return res.data;
}

export async function getTicketDetail(id: string): Promise<TicketDetail> {
  if (API_MODE === "mock") {
    const t = mockGetTicket(id);
    if (!t) throw new Error("Comanda no encontrada");
    return t;
  }
  const res = await api.get<TicketDetail>(`/tickets/${id}`);
  return res.data;
}

export async function runSync(opts?: {
  tipo_docto?: string;
  lookback_minutes?: number;
  limit?: number;
}): Promise<SyncRunResult> {
  const payload = {
    tipo_docto: opts?.tipo_docto ?? "01f",
    lookback_minutes: opts?.lookback_minutes ?? 1440,
    limit: opts?.limit ?? 300,
  };

  if (API_MODE === "mock") {
    await new Promise((r) => setTimeout(r, 600));
    return {
      ok: true,
      run_id: crypto.randomUUID(),
      mode: "MANUAL",
      new_tickets: 0,
      updated_tickets: 0,
      new_items: 0,
      updated_items: 0,
      skipped_items: 0,
      total_doctos_sqlserver: 0,
      used_rowversion: false,
      used_fallback_without_date_filter: false,
      last_sync_at: new Date().toISOString(),
      last_rowversion: null,
    };
  }

  const res = await api.post<SyncRunResult>("/admin/sync", payload);
  return res.data;
}

export async function listSyncRuns(limit = 50): Promise<SyncRun[]> {
  if (API_MODE === "mock") return [];
  const res = await api.get<SyncRun[]>("/admin/sync/runs", {
    params: { source: "SIESA", limit },
  });
  return res.data;
}

export async function getLatestSyncRun(): Promise<SyncRun | null> {
  if (API_MODE === "mock") return null;
  const res = await api.get<SyncRun | null>("/admin/sync/runs/latest", {
    params: { source: "SIESA" },
  });
  return res.data;
}

export async function updateItemStatus(opts: {
  ticketId: string;
  itemId: string;
  status: ItemStatus;
  user_name: string;
}): Promise<void> {
  if (API_MODE === "mock") {
    await new Promise((r) => setTimeout(r, 250));
    return;
  }
  await api.patch(`/tickets/${opts.ticketId}/items/${opts.itemId}/status`, {
    status: opts.status,
    user_name: opts.user_name,
  });
}

export async function prepareAllItems(opts: {
  ticketId: string;
  user_name: string;
}): Promise<{ ok: boolean; changed_items: number }> {
  if (API_MODE === "mock") {
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true, changed_items: 0 };
  }
  const res = await api.post<{ ok: boolean; changed_items: number }>(
    `/tickets/${opts.ticketId}/prepare-all`,
    { user_name: opts.user_name }
  );
  return res.data;
}

export async function deliverAllItems(opts: {
  ticketId: string;
  user_name: string;
}): Promise<{ ok: boolean; changed_items: number }> {
  if (API_MODE === "mock") {
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true, changed_items: 0 };
  }
  const res = await api.post<{ ok: boolean; changed_items: number }>(
    `/tickets/${opts.ticketId}/deliver-all`,
    { user_name: opts.user_name }
  );
  return res.data;
}

export async function cancelItem(opts: {
  ticketId: string;
  itemId: string;
  reason: string;
  user_name: string;
}): Promise<void> {
  if (API_MODE === "mock") {
    await new Promise((r) => setTimeout(r, 250));
    return;
  }
  await api.post(`/tickets/${opts.ticketId}/items/${opts.itemId}/cancel`, {
    reason: opts.reason,
    user_name: opts.user_name,
  });
}

export async function replaceItem(opts: {
  ticketId: string;
  itemId: string;
  new_product_name: string;
  reason: string;
  user_name: string;
}): Promise<void> {
  if (API_MODE === "mock") {
    await new Promise((r) => setTimeout(r, 250));
    return;
  }
  await api.post(`/tickets/${opts.ticketId}/items/${opts.itemId}/replace`, {
    new_product_name: opts.new_product_name,
    reason: opts.reason,
    user_name: opts.user_name,
  });
}

export async function printTicket(ticketId: string): Promise<string> {
  if (API_MODE === "mock") {
    const t = mockGetTicket(ticketId);
    if (!t) throw new Error("Comanda no encontrada");
    return `<!doctype html><html><head><meta charset='utf-8'/><title>Comanda ${t.comanda_number}</title></head><body>
      <h2>Comanda #${t.comanda_number}</h2>
      <div>Mesa: ${t.mesa_ref ?? ""}</div>
      <div>Mesero: ${t.mesero_nombre ?? ""}</div>
      <hr/>
      <ul>${t.items.map((i) => `<li>${i.qty} x ${i.product_name} (${i.status})</li>`).join("")}</ul>
      <script>window.print()</script>
    </body></html>`;
  }

  const res = await api.post<string>(`/tickets/${ticketId}/print`, undefined, {
    headers: { Accept: "text/html" },
    responseType: "text",
  });
  return res.data;
}

export async function printTicket80(ticketId: string, width = 80): Promise<string> {
  if (API_MODE === "mock") return await printTicket(ticketId);

  const res = await api.post<string>(`/tickets/${ticketId}/print?width=${width}`, undefined, {
    headers: { Accept: "text/html" },
    responseType: "text",
  });
  return res.data;
}

export async function getTicketEvents(ticketId: string) {
  if (API_MODE === "mock") return [];
  const res = await api.get<any[]>(`/tickets/${ticketId}/events`);
  return res.data;
}