import { useEffect } from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetSprintsQuery } from '../../services/sprintsApi';
import { useGetProjectMembersQuery } from '../../services/projectsApi';
import { useCreateTicketMutation, useUpdateTicketMutation } from '../../services/ticketsApi';
import type { Ticket, TicketStatus } from '../../types';
import { TICKET_STATUS_LABELS, TICKET_STATUSES } from '../../types';

const schema = z.object({
  subject:     z.string().min(1, 'Subject is required').max(200),
  description: z.string(),
  estimate:    z.string().refine((v) => !v || parseFloat(v) >= 0, 'Estimate must be 0 or greater'),
  status:      z.string(),
  sprintId:    z.string(),
  assigneeId:  z.string(),
});
type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  subject: '', description: '', estimate: '', status: 'ToDo', sprintId: '', assigneeId: '',
};

interface Props {
  projectId: string;
  ticket?: Ticket;
  open: boolean;
  onClose: () => void;
}

export default function TicketForm({ projectId, ticket, open, onClose }: Props) {
  const isEdit = Boolean(ticket);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    reValidateMode: 'onChange',
  });

  const { data: sprints = [] } = useGetSprintsQuery(projectId);
  const { data: members = [] } = useGetProjectMembersQuery(projectId);
  const [createTicket, { isLoading: creating }] = useCreateTicketMutation();
  const [updateTicket, { isLoading: updating }] = useUpdateTicketMutation();

  const isLoading = creating || updating;
  const busy      = isLoading || isSubmitting;

  useEffect(() => {
    if (open) {
      reset({
        subject:     ticket?.subject     ?? '',
        description: ticket?.description ?? '',
        estimate:    ticket?.estimate?.toString() ?? '',
        status:      ticket?.status      ?? 'ToDo',
        sprintId:    ticket?.sprintId    ?? '',
        assigneeId:  ticket?.assigneeId  ?? '',
      });
    }
  }, [open, ticket, reset]);

  const onSubmit = async (data: FormValues) => {
    const body = {
      projectId,
      subject:     data.subject,
      description: data.description || null,
      estimate:    data.estimate ? parseFloat(data.estimate) : null,
      assigneeId:  data.assigneeId || null,
      sprintId:    data.sprintId   || null,
      status:      data.status as TicketStatus,
    };

    try {
      if (isEdit && ticket) {
        await updateTicket({ ...body, ticketId: ticket.id }).unwrap();
      } else {
        await createTicket(body).unwrap();
      }
      onClose();
    } catch { /* error handled globally via rtkQueryErrorMiddleware */ }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Edit ticket' : 'New ticket'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Subject"
              {...register('subject')}
              error={!!errors.subject}
              helperText={errors.subject?.message}
              required
              autoFocus
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              label="Description"
              {...register('description')}
              multiline
              minRows={2}
            />
            <TextField
              label="Estimate (points)"
              type="number"
              {...register('estimate')}
              error={!!errors.estimate}
              helperText={errors.estimate?.message}
              slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormControl required>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select {...field} labelId="status-label" label="Status">
                    {TICKET_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="sprintId"
              control={control}
              render={({ field }) => (
                <FormControl>
                  <InputLabel id="sprint-label" shrink>Sprint</InputLabel>
                  <Select {...field} labelId="sprint-label" label="Sprint" displayEmpty>
                    <MenuItem value="">Backlog</MenuItem>
                    {sprints.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <FormControl>
                  <InputLabel id="assignee-label" shrink>Assignee</InputLabel>
                  <Select {...field} labelId="assignee-label" label="Assignee" displayEmpty>
                    <MenuItem value="">Unassigned</MenuItem>
                    {members.map((m) => (
                      <MenuItem key={m.userId} value={m.userId}>{m.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy} aria-label={isEdit ? 'save ticket' : 'create ticket'}>
            {busy ? <CircularProgress size={20} /> : isEdit ? 'Save' : 'Create ticket'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
