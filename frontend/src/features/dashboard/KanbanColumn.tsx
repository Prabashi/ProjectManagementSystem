import { useState } from 'react';
import type React from 'react';
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
  draggingId?: string | null;
  onDragStart?: (ticketId: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, status: TicketStatus) => void;
}

export default function KanbanColumn({
  status, tickets, isAdmin, onEdit, onDelete,
  draggingId, onDragStart, onDragEnd, onDragOver, onDrop,
}: Props) {
  const [isOver, setIsOver] = useState(false);
  const isDragging = draggingId != null;

  return (
    <Box
      data-testid={`kanban-column-${status}`}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); onDragOver?.(e); }}
      onDragEnter={() => setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { setIsOver(false); onDrop?.(e, status); }}
      sx={{
        minWidth: 260,
        maxWidth: 280,
        flexShrink: 0,
        borderRadius: 1,
        outline: isDragging && !isOver ? '1px dashed' : 'none',
        outlineColor: 'divider',
        bgcolor: isOver ? 'action.hover' : 'transparent',
        transition: 'background-color 0.15s',
      }}
    >
      <Paper
        variant="outlined"
        sx={{ px: 1.5, py: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          {TICKET_STATUS_LABELS[status]}
        </Typography>
        <Chip label={tickets.length} size="small" />
      </Paper>
      <Stack spacing={1} sx={{ minHeight: 48 }}>
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
              showStatus={false}
              draggable={!!onDragStart}
              isDragging={ticket.id === draggingId}
              onDragStart={() => onDragStart?.(ticket.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </Stack>
    </Box>
  );
}
