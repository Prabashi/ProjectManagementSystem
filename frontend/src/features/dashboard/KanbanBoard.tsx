import { Box } from '@mui/material';
import type { Ticket, TicketStatus } from '../../types';
import { TICKET_STATUSES } from '../../types';
import KanbanColumn from './KanbanColumn';

interface Props {
  tickets: Ticket[];
  isAdmin: boolean;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticketId: string) => void;
}

export default function KanbanBoard({ tickets, isAdmin, onEdit, onDelete }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
      {(TICKET_STATUSES as TicketStatus[]).map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tickets={tickets.filter((t) => t.status === status)}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Box>
  );
}
