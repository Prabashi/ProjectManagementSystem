import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useGetProjectByIdQuery, useGetProjectMembersQuery } from '../../services/projectsApi';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../auth/authSlice';
import AddMemberDialog from './AddMemberDialog';
import SprintPanel from '../sprints/SprintPanel';
import TicketListPanel from '../tickets/TicketListPanel';

export default function ProjectDetailPage() {
  const { id = '' }                 = useParams<{ id: string }>();
  const navigate                    = useNavigate();
  const user                        = useAppSelector(selectUser);
  const [tab, setTab]               = useState(0);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading }     = useGetProjectByIdQuery(id);
  const { data: members = [], isLoading: membersLoading } = useGetProjectMembersQuery(id);

  if (projectLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  if (!project) {
    return <Typography>Project not found.</Typography>;
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mb: 2 }}>
        Back to projects
      </Button>

      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4">{project.name}</Typography>
        {project.description && (
          <Typography color="text.secondary">{project.description}</Typography>
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Members" />
        <Tab label="Sprints" />
        <Tab label="Tickets" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Members</Typography>
            {user?.role === 'Admin' && (
              <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setMemberDialogOpen(true)}>
                Add member
              </Button>
            )}
          </Box>
          {membersLoading ? (
            <CircularProgress size={24} />
          ) : (
            <List dense>
              {members.map((m) => (
                <ListItem key={m.userId} disableGutters>
                  <ListItemText primary={m.username} />
                  <Chip label={m.role} size="small" variant="outlined" />
                </ListItem>
              ))}
            </List>
          )}
          <AddMemberDialog projectId={id} open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} />
        </Box>
      )}

      {tab === 1 && (
        <SprintPanel projectId={id} isAdmin={user?.role === 'Admin'} />
      )}

      {tab === 2 && (
        <TicketListPanel projectId={id} isAdmin={user?.role === 'Admin'} />
      )}
    </Box>
  );
}
