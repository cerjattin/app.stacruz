import type { TicketDetail, TicketStatus } from "../lib/types";

const now = new Date();
const toIso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();

const sample: TicketDetail[] = [
  {
    id: "6c4d7c80-1111-4a11-9d1b-000000000001",
    comanda_number: 231,
    mesa_ref: "12",
    mesero_nombre: "Carlos",
    pos_consec_docto: 10452,
    status: "PENDIENTE",
    hora_pedido: toIso(18),
    hora_preparacion: null,
    hora_entrega: null,
    items: [
      { id: "i-1", product_name: "Hamburguesa clásica", qty: 2, unidad: "UND", status: "PENDIENTE" },
      { id: "i-2", product_name: "Papas francesas", qty: 1, unidad: "UND", status: "PENDIENTE" },
    ],
  },
  {
    id: "6c4d7c80-2222-4a11-9d1b-000000000002",
    comanda_number: 232,
    mesa_ref: "7",
    mesero_nombre: "Laura",
    pos_consec_docto: 10453,
    status: "EN_PREPARACION",
    hora_pedido: toIso(16),
    hora_preparacion: toIso(14),
    hora_entrega: null,
    items: [
      { id: "i-3", product_name: "Sopa del día", qty: 1, unidad: "UND", status: "EN_PREPARACION" },
      { id: "i-4", product_name: "Jugo natural", qty: 2, unidad: "UND", status: "PENDIENTE" },
    ],
  },
  {
    id: "6c4d7c80-3333-4a11-9d1b-000000000003",
    comanda_number: 233,
    mesa_ref: "2",
    mesero_nombre: "Andrés",
    pos_consec_docto: 10454,
    status: "LISTO",
    hora_pedido: toIso(12),
    hora_preparacion: toIso(11),
    hora_entrega: toIso(2),
    items: [
      { id: "i-5", product_name: "Pollo a la plancha", qty: 1, unidad: "UND", status: "ENTREGADO" },
      { id: "i-6", product_name: "Ensalada", qty: 1, unidad: "UND", status: "ENTREGADO" },
    ],
  },
];

export function mockListTickets(params?: { status?: TicketStatus; q?: string }): TicketDetail[] {
  const q = (params?.q ?? "").trim().toLowerCase();
  const status = params?.status;
  return sample
    .filter((t) => (status ? t.status === status : true))
    .filter((t) => {
      if (!q) return true;
      const hay = `${t.mesa_ref ?? ""} ${t.mesero_nombre ?? ""} ${t.pos_consec_docto ?? ""} ${t.comanda_number}`.toLowerCase();
      return hay.includes(q);
    })
    .map(({ items, ...card }) => ({ ...card, items }));
}

export function mockGetTicket(id: string): TicketDetail | null {
  return sample.find((t) => t.id === id) ?? null;
}
