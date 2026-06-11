import { api } from './api';
import type { Ticket, TicketStatus } from '../types';

interface CreateTicketRequest {
  subject: string;
  description?: string | null;
  estimate?: number | null;
  assigneeId?: string | null;
  sprintId?: string | null;
  status: TicketStatus;
}

interface UpdateTicketRequest extends CreateTicketRequest {}

export const ticketsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTickets: builder.query<Ticket[], { projectId: string; sprintId?: string }>({
      query: ({ projectId, sprintId }) => {
        const base = `projects/${projectId}/tickets`;
        return sprintId ? `${base}?sprintId=${sprintId}` : base;
      },
      providesTags: (_result, _error, { projectId }) => [{ type: 'Ticket', id: projectId }],
      keepUnusedDataFor: 0,
    }),
    getTicketById: builder.query<Ticket, { projectId: string; ticketId: string }>({
      query: ({ projectId, ticketId }) => `projects/${projectId}/tickets/${ticketId}`,
      providesTags: (_result, _error, { ticketId }) => [{ type: 'Ticket', id: ticketId }],
    }),
    createTicket: builder.mutation<Ticket, { projectId: string } & CreateTicketRequest>({
      query: ({ projectId, ...body }) => ({
        url: `projects/${projectId}/tickets`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Ticket', id: projectId }],
    }),
    updateTicket: builder.mutation<Ticket, { projectId: string; ticketId: string } & UpdateTicketRequest>({
      query: ({ projectId, ticketId, ...body }) => ({
        url: `projects/${projectId}/tickets/${ticketId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Ticket', id: projectId }],
    }),
    deleteTicket: builder.mutation<void, { projectId: string; ticketId: string }>({
      query: ({ projectId, ticketId }) => ({
        url: `projects/${projectId}/tickets/${ticketId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Ticket', id: projectId }],
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketByIdQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
} = ticketsApi;
