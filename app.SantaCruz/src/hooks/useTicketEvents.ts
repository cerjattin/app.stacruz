import { useEffect, useState } from "react";
import * as ticketsService from "../services/ticketsService";

export type TicketEvent = {
  id: string;
  ticket_id: string;
  item_id: string | null;
  event_type: string; // "ITEM_STATUS" | "ITEM_CANCEL" | "ITEM_REPLACE" | "PRINT" | ...
  message: string;
  meta: any | null;
  user_name: string | null;
  created_at: string; // ISO
};

export function useTicketEvents(ticketId: string | null) {
  const [data, setData] = useState<TicketEvent[] | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isError, setError] = useState(false);
  const [error, setErrorObj] = useState<any>(null);

  async function refetch() {
    if (!ticketId) return;
    setLoading(true);
    setError(false);
    setErrorObj(null);
    try {
      const res = (await ticketsService.getTicketEvents(ticketId)) as TicketEvent[];
      setData(res);
    } catch (e: any) {
      setError(true);
      setErrorObj(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ticketId) {
      setData(null);
      return;
    }
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  return { data, isLoading, isError, error, refetch };
}