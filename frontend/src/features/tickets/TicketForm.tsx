import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useGetSprintsQuery } from '../../services/sprintsApi';
import { useGetProjectMembersQuery } from '../../services/projectsApi';
import { useCreateTicketMutation, useUpdateTicketMutation } from '../../services/ticketsApi';
import type { Ticket, TicketStatus } from '../../types';
import { TICKET_STATUS_LABELS, TICKET_STATUSES } from '../../types';

interface Props {
  projectId: string;
  ticket?: Ticket;
  open: boolean;
  onClose: () => void;
}

export default function TicketForm({ projectId, ticket, open, onClose }: Props) {
  const isEdit = Boolean(ticket);

  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [estimate,    setEstimate]    = useState('');
  const [assigneeId,  setAssigneeId]  = useState('');
  const [sprintId,    setSprintId]    = useState('');
  const [status,      setStatus]      = useState<TicketStatus>('ToDo');

  const { data: sprints  = [] } = useGetSprintsQuery(projectId);
  const { data: members  = [] } = useGetProjectMembersQuery(projectId);
  const [createTicket, { isLoading: creating }] = useCreateTicketMutation();
  const [updateTicket, { isLoading: updating }] = useUpdateTicketMutation();

  const isLoading = creating || updating;

  useEffect(() => {
    if (open) {
      setSubject(ticket?.subject ?? '');
      setDescription(ticket?.description ?? '');
      setEstimate(ticket?.estimate?.toString() ?? '');
      setAssigneeId(ticket?.assigneeId ?? '');
      setSprintId(ticket?.sprintId ?? '');
      setStatus(ticket?.status ?? 'ToDo');
    }
  }, [open, ticket]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const body = {
      projectId,
      subject,
      description: description || null,
      estimate:    estimate ? parseFloat(estimate) : null,
      assigneeId:  assigneeId || null,
      sprintId:    sprintId || null,
      status,
    };

    try {
      if (isEdit && ticket) {
        await updateTicket({ ...body, ticketId: ticket.id }).unwrap();
      } else {
        await createTicket(body).unwrap();
      }
      handleClose();
    } catch { /* error handled globally via rtkQueryErrorMiddleware */ }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Edit ticket' : 'New ticket'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              autoFocus
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={2}
            />
            <TextField
              label="Estimate (points)"
              type="number"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
            />
            <FormControl required>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
              >
                {TICKET_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="sprint-label" shrink>Sprint</InputLabel>
              <Select
                labelId="sprint-label"
                label="Sprint"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Backlog</MenuItem>
                {sprints.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="assignee-label" shrink>Assignee</InputLabel>
              <Select
                labelId="assignee-label"
                label="Assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Unassigned</MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.userId} value={m.userId}>{m.username}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading} aria-label={isEdit ? 'save ticket' : 'create ticket'}>
            {isLoading ? <CircularProgress size={20} /> : isEdit ? 'Save' : 'Create ticket'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
