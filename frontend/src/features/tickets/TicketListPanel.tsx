import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetTicketsQuery, useDeleteTicketMutation } from '../../services/ticketsApi';
import { useGetSprintsQuery } from '../../services/sprintsApi';
import type { Ticket } from '../../types';
import TicketCard from './TicketCard';
import TicketForm from './TicketForm';

interface Props {
  projectId: string;
  isAdmin: boolean;
}

export default function TicketListPanel({ projectId, isAdmin }: Props) {
  const [formOpen,       setFormOpen]       = useState(false);
  const [editingTicket,  setEditingTicket]  = useState<Ticket | undefined>(undefined);
  const [sprintFilter,   setSprintFilter]   = useState<string>('all');

  const { data: tickets = [], isLoading: ticketsLoading } = useGetTicketsQuery({ projectId });
  const { data: sprints = [] }                             = useGetSprintsQuery(projectId);
  const [deleteTicket]                                     = useDeleteTicketMutation();

  const filteredTickets = tickets.filter((t) => {
    if (sprintFilter === 'all')     return true;
    if (sprintFilter === 'backlog') return !t.sprintId;
    return t.sprintId === sprintFilter;
  });

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTicket(undefined);
  };

  if (ticketsLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sprint-filter-label">Sprint</InputLabel>
          <Select
            labelId="sprint-filter-label"
            label="Sprint"
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
          >
            <MenuItem value="all">All tickets</MenuItem>
            <MenuItem value="backlog">Backlog</MenuItem>
            {sprints.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}{s.isActive ? ' (Active)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
          New ticket
        </Button>
      </Stack>

      {filteredTickets.length === 0 ? (
        <Typography color="text.secondary">
          {tickets.length === 0 ? 'No tickets yet.' : 'No tickets match this filter.'}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isAdmin={isAdmin}
              onEdit={() => handleEdit(ticket)}
              onDelete={() => deleteTicket({ projectId, ticketId: ticket.id })}
            />
          ))}
        </Stack>
      )}

      <TicketForm
        projectId={projectId}
        ticket={editingTicket}
        open={formOpen}
        onClose={handleFormClose}
      />
    </Box>
  );
}
