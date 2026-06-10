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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { useAddProjectMemberMutation, useGetProjectMembersQuery } from '../../services/projectsApi';
import { useGetUsersQuery } from '../../services/usersApi';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export default function AddMemberDialog({ projectId, open, onClose }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addMember, { isLoading, error }]   = useAddProjectMemberMutation();
  const { data: allUsers = [] }             = useGetUsersQuery();
  const { data: currentMembers = [] }       = useGetProjectMembersQuery(projectId);

  const memberIds       = new Set(currentMembers.map((m) => m.userId));
  const availableUsers  = allUsers.filter((u) => !memberIds.has(u.id));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      await addMember({ projectId, userId: selectedUserId }).unwrap();
      setSelectedUserId('');
      onClose();
    } catch { /* error shown from mutation state */ }
  };

  const handleClose = () => {
    setSelectedUserId('');
    onClose();
  };

  const errorMessage = error
    ? 'status' in error
      ? ((error.data as { title?: string })?.title ?? 'Failed to add member')
      : (error.message ?? 'Failed to add member')
    : null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add member</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl required fullWidth>
              <InputLabel id="user-label">User</InputLabel>
              <Select
                labelId="user-label"
                label="User"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                displayEmpty
              >
                {availableUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading || !selectedUserId} aria-label="add member">
            {isLoading ? <CircularProgress size={20} /> : 'Add'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
