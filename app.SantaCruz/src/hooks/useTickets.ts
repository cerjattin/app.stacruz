import { useQuery } from "@tanstack/react-query";
import type { TicketStatus } from "../lib/types";
import * as ticketsService from "../services/ticketsService";

export function useTickets(params: { status?: TicketStatus; q?: string }) {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: () => ticketsService.listTickets(params),
    refetchInterval: 5_000,
  });
}
