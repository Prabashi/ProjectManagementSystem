import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { Ticket, TicketStatus } from '../../types';
import { TICKET_STATUS_LABELS } from '../../types';
import TicketCard from '../tickets/TicketCard';

interface Props {
  status: TicketStatus;
  tickets: Ticket[];
  isAdmin: boolean;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticketId: string) => void;
}

export default function KanbanColumn({ status, tickets, isAdmin, onEdit, onDelete }: Props) {
  return (
    <Box sx={{ minWidth: 260, maxWidth: 280, flexShrink: 0 }}>
      <Paper
        variant="outlined"
        sx={{ px: 1.5, py: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
          {TICKET_STATUS_LABELS[status]}
        </Typography>
        <Chip label={tickets.length} size="small" />
      </Paper>
      <Stack spacing={1}>
        {tickets.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            No tickets
          </Typography>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isAdmin={isAdmin}
              onEdit={() => onEdit(ticket)}
              onDelete={() => onDelete(ticket.id)}
            />
          ))
        )}
      </Stack>
    </Box>
  );
}
