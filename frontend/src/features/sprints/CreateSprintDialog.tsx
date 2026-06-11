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
import { useCreateSprintMutation } from '../../services/sprintsApi';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export default function CreateSprintDialog({ projectId, open, onClose }: Props) {
  const [name, setName]           = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [createSprint, { isLoading, error }] = useCreateSprintMutation();

  const handleClose = () => {
    setName('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      await createSprint({
        projectId,
        name,
        startDate: startDate || null,
        endDate: endDate || null,
      }).unwrap();
      handleClose();
    } catch { /* error rendered from mutation state */ }
  };

  const errorMessage = error
    ? 'status' in error
      ? ((error.data as { title?: string })?.title ?? 'Failed to create sprint')
      : (error.message ?? 'Failed to create sprint')
    : null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>New sprint</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading} aria-label="create sprint">
            {isLoading ? <CircularProgress size={20} /> : 'Create sprint'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
