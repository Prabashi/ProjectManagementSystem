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
import { useCreateProjectMutation } from '../../services/projectsApi';

const schema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectDialog({ open, onClose }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
    reValidateMode: 'onChange',
  });
  const [createProject, { isLoading }] = useCreateProjectMutation();

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await createProject({ name: data.name, description: data.description || undefined }).unwrap();
      handleClose();
    } catch { /* error handled globally via rtkQueryErrorMiddleware */ }
  };

  const busy = isLoading || isSubmitting;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New project</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
              label="Description"
              {...register('description')}
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy} aria-label="create project">
            {busy ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
