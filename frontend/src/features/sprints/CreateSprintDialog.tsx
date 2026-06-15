import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateSprintMutation } from '../../services/sprintsApi';

const schema = z.object({
  name:      z.string().min(1, 'Name is required').max(100),
  startDate: z.string(),
  endDate:   z.string(),
}).refine(
  ({ startDate, endDate }) => !(startDate && endDate && endDate < startDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);
type FormValues = z.infer<typeof schema>;

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export default function CreateSprintDialog({ projectId, open, onClose }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', startDate: '', endDate: '' },
    reValidateMode: 'onChange',
  });
  const [createSprint, { isLoading }] = useCreateSprintMutation();

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await createSprint({
        projectId,
        name:      data.name,
        startDate: data.startDate || null,
        endDate:   data.endDate   || null,
      }).unwrap();
      handleClose();
    } catch { /* error handled globally via rtkQueryErrorMiddleware */ }
  };

  const busy = isLoading || isSubmitting;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>New sprint</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Name"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              required
              autoFocus
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="Start date"
              type="date"
              {...register('startDate')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="End date"
              type="date"
              {...register('endDate')}
              error={!!errors.endDate}
              helperText={errors.endDate?.message}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy} aria-label="create sprint">
            {busy ? <CircularProgress size={20} /> : 'Create sprint'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
