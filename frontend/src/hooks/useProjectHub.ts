import { useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAppDispatch } from '../app/hooks';
import { api } from '../services/api';
import type { Dashboard, Ticket } from '../types';

const HUB_URL =
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5231/api').replace(/\/api$/, '') +
  '/hubs/project';

export function useProjectHub(projectId: string): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    connection.on('TicketCreated', ({ ticket }: { ticket: Ticket }) => {
      dispatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.util.updateQueryData as any)('getDashboard', projectId, (draft: Dashboard) => {
          if (!draft.tickets.some((t) => t.id === ticket.id))
            draft.tickets.push(ticket);
        }),
      );
    });

    connection.on('TicketUpdated', ({ ticket }: { ticket: Ticket }) => {
      dispatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.util.updateQueryData as any)('getDashboard', projectId, (draft: Dashboard) => {
          const i = draft.tickets.findIndex((t) => t.id === ticket.id);
          if (i !== -1) draft.tickets[i] = ticket;
        }),
      );
    });

    connection.on('TicketDeleted', ({ ticketId }: { ticketId: string }) => {
      dispatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.util.updateQueryData as any)('getDashboard', projectId, (draft: Dashboard) => {
          const i = draft.tickets.findIndex((t) => t.id === ticketId);
          if (i !== -1) draft.tickets.splice(i, 1);
        }),
      );
    });

    connection.on('SprintChanged', () => {
      dispatch(api.util.invalidateTags([{ type: 'Dashboard', id: projectId }]));
    });

    connection
      .start()
      .then(() => connection.invoke('JoinProject', projectId))
      .catch(console.error);

    return () => {
      connection.invoke('LeaveProject', projectId).catch(console.error);
      connection.stop();
    };
  }, [dispatch, projectId]);
}
