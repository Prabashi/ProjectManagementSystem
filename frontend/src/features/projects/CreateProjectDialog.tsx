import { useState } from 'react';
import {
  Alert,
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
import { useCreateProjectMutation } from '../../services/projectsApi';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectDialog({ open, onClose }: Props) {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [createProject, { isLoading, error }] = useCreateProjectMutation();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      await createProject({ name, description: description || undefined }).unwrap();
      setName('');
      setDescription('');
      onClose();
    } catch { /* error shown from mutation state */ }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const errorMessage = error
    ? 'status' in error
      ? ((error.data as { title?: string })?.title ?? 'Failed to create project')
      : (error.message ?? 'Failed to create project')
    : null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New project</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
            />
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading} aria-label="create project">
            {isLoading ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
