import { useQuery } from "@tanstack/react-query";
import * as ticketsService from "../services/ticketsService";

export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => {
      if (!ticketId) throw new Error("ticketId requerido");
      return ticketsService.getTicketDetail(ticketId);
    },
    enabled: Boolean(ticketId),
    refetchInterval: ticketId ? 2_000 : false,
  });
}
