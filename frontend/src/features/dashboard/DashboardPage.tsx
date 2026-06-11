import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useGetDashboardQuery, useCreateDashboardMutation } from '../../services/dashboardApi';
import { useGetProjectMembersQuery } from '../../services/projectsApi';
import { useDeleteTicketMutation } from '../../services/ticketsApi';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../auth/authSlice';
import type { Ticket } from '../../types';
import { useProjectHub } from '../../hooks/useProjectHub';
import AssigneeFilter from './AssigneeFilter';
import KanbanBoard from './KanbanBoard';
import TicketForm from '../tickets/TicketForm';

export default function DashboardPage() {
  const { id: projectId = '' } = useParams<{ id: string }>();
  const navigate               = useNavigate();
  const user                   = useAppSelector(selectUser);
  const isAdmin                = user?.role === 'Admin';

  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [editingTicket,  setEditingTicket]  = useState<Ticket | undefined>();
  const [formOpen,       setFormOpen]       = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [dashboardName,  setDashboardName]  = useState('');

  useProjectHub(projectId);

  const { data: dashboard, isLoading, isError, error } = useGetDashboardQuery(projectId);
  const { data: members = [] }                          = useGetProjectMembersQuery(projectId);
  const [deleteTicket]                                  = useDeleteTicketMutation();
  const [createDashboard, { isLoading: creating, error: createError }] = useCreateDashboardMutation();

  const isDashboardMissing =
    isError && error !== undefined && 'status' in error && error.status === 404;

  const filteredTickets = (dashboard?.tickets ?? []).filter((t) =>
    assigneeFilter ? t.assigneeId === assigneeFilter : true
  );

  const handleCreate = async () => {
    try {
      await createDashboard({ projectId, name: dashboardName.trim() || 'Project Dashboard' }).unwrap();
      setCreateOpen(false);
      setDashboardName('');
    } catch { /* error shown from mutation state */ }
  };

  const createErrorMessage = createError
    ? 'status' in createError
      ? ((createError.data as { title?: string })?.title ?? 'Failed to create dashboard')
      : (createError.message ?? 'Failed to create dashboard')
    : null;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isDashboardMissing) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/projects/${projectId}`)} sx={{ mb: 3 }}>
          Back to project
        </Button>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="h5">Dashboard</Typography>
          <Typography color="text.secondary">No dashboard has been created for this project yet.</Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<DashboardIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Create Dashboard
            </Button>
          )}
        </Stack>

        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Create Dashboard</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Dashboard name"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                autoFocus
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              {createErrorMessage && <Alert severity="error">{createErrorMessage}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreate} disabled={creating} aria-label="confirm create dashboard">
              {creating ? <CircularProgress size={20} /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  if (!dashboard) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/projects/${projectId}`)}>
          Back to project
        </Button>
        <Typography variant="h5">{dashboard.name}</Typography>
        <Box sx={{ width: 140 }} />
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <AssigneeFilter members={members} value={assigneeFilter} onChange={setAssigneeFilter} />
      </Stack>

      {dashboard.activeSprintId ? (
        <KanbanBoard
          projectId={projectId}
          tickets={filteredTickets}
          isAdmin={isAdmin}
          onEdit={(t) => { setEditingTicket(t); setFormOpen(true); }}
          onDelete={(ticketId) => deleteTicket({ projectId, ticketId })}
        />
      ) : (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          No active sprint. Set an active sprint on the Sprints tab to see tickets on the board.
        </Typography>
      )}

      <TicketForm
        projectId={projectId}
        ticket={editingTicket}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTicket(undefined); }}
      />
    </Box>
  );
}
