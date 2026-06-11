import { Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Ticket, TicketStatus } from '../../types';
import { TICKET_STATUS_LABELS } from '../../types';

const STATUS_COLORS: Record<TicketStatus, 'default' | 'primary' | 'warning' | 'secondary' | 'info' | 'success'> = {
  ToDo:       'default',
  InProgress: 'primary',
  InReview:   'warning',
  ToDeploy:   'secondary',
  Testing:    'info',
  Done:       'success',
};

interface Props {
  ticket: Ticket;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function TicketCard({ ticket, isAdmin, onEdit, onDelete, draggable = false, isDragging = false, onDragStart, onDragEnd }: Props) {
  return (
    <Card
      role="article"
      variant="outlined"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      sx={{ opacity: isDragging ? 0.4 : 1, cursor: draggable ? 'grab' : 'default', transition: 'opacity 0.15s' }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="subtitle2" gutterBottom>{ticket.subject}</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
              <Chip
                label={TICKET_STATUS_LABELS[ticket.status]}
                color={STATUS_COLORS[ticket.status]}
                size="small"
              />
              {ticket.assigneeName && (
                <Typography variant="caption" color="text.secondary">
                  {ticket.assigneeName}
                </Typography>
              )}
              {ticket.estimate != null && (
                <Typography variant="caption" color="text.secondary">
                  {ticket.estimate} pts
                </Typography>
              )}
            </Stack>
          </Box>
          <Stack direction="row" spacing={0}>
            <Tooltip title="Edit ticket">
              <IconButton size="small" onClick={onEdit} aria-label={`edit ${ticket.subject}`}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Delete ticket">
                <IconButton size="small" onClick={onDelete} aria-label={`delete ${ticket.subject}`}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
