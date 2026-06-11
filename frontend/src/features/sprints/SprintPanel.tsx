import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetSprintsQuery, useSetActiveSprintMutation, useDeleteSprintMutation } from '../../services/sprintsApi';
import CreateSprintDialog from './CreateSprintDialog';

interface Props {
  projectId: string;
  isAdmin: boolean;
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'No dates set';
  if (start && end)   return `${start} → ${end}`;
  if (start)          return `From ${start}`;
  return `Until ${end}`;
}

export default function SprintPanel({ projectId, isAdmin }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: sprints = [], isLoading }      = useGetSprintsQuery(projectId);
  const [setActive, { isLoading: activating }] = useSetActiveSprintMutation();
  const [deleteSprint]                          = useDeleteSprintMutation();

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Sprints</Typography>
        {isAdmin && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            New sprint
          </Button>
        )}
      </Box>

      {sprints.length === 0 ? (
        <Typography color="text.secondary">No sprints yet.</Typography>
      ) : (
        <List disablePadding>
          {sprints.map((sprint, index) => (
            <Box key={sprint.id}>
              {index > 0 && <Divider />}
              <ListItem
                disableGutters
                secondaryAction={
                  isAdmin && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        size="small"
                        variant={sprint.isActive ? 'contained' : 'outlined'}
                        disabled={sprint.isActive || activating}
                        onClick={() => setActive({ projectId, sprintId: sprint.id })}
                        aria-label={`set ${sprint.name} active`}
                      >
                        {sprint.isActive ? 'Active' : 'Set active'}
                      </Button>
                      <Tooltip title="Delete sprint">
                        <IconButton
                          size="small"
                          onClick={() => deleteSprint({ projectId, sprintId: sprint.id })}
                          aria-label={`delete ${sprint.name}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>{sprint.name}</Typography>
                      {sprint.isActive && <Chip label="Active" color="success" size="small" />}
                    </Stack>
                  }
                  secondary={formatDateRange(sprint.startDate, sprint.endDate)}
                />
              </ListItem>
            </Box>
          ))}
        </List>
      )}

      <CreateSprintDialog
        projectId={projectId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}
