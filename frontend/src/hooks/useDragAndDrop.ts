import { useCallback, useState } from 'react';
import type React from 'react';
import { useAppDispatch } from '../app/hooks';
import { api } from '../services/api';
import { useMoveTicketMutation } from '../services/ticketsApi';
import type { Dashboard, TicketStatus } from '../types';

export interface DragAndDropHandlers {
  draggingId: string | null;
  onDragStart: (ticketId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: TicketStatus) => void;
}

export function useDragAndDrop(projectId: string): DragAndDropHandlers {
  const dispatch = useAppDispatch();
  const [moveTicket] = useMoveTicketMutation();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onDragStart = useCallback((ticketId: string) => {
    setDraggingId(ticketId);
  }, []);

  const onDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent, status: TicketStatus) => {
      e.preventDefault();
      const ticketId = draggingId;
      setDraggingId(null);
      if (!ticketId) return;

      const patchResult = dispatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.util.updateQueryData as any)(
          'getDashboard',
          projectId,
          (draft: Dashboard) => {
            const ticket = draft.tickets.find((t) => t.id === ticketId);
            if (ticket) ticket.status = status;
          },
        ),
      );

      try {
        await moveTicket({ projectId, ticketId, status }).unwrap();
      } catch {
        patchResult.undo();
      }
    },
    [dispatch, draggingId, moveTicket, projectId],
  );

  return { draggingId, onDragStart, onDragEnd, onDragOver, onDrop };
}
