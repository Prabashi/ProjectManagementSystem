import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGetProjectsQuery } from '../../services/projectsApi';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../auth/authSlice';
import CreateProjectDialog from './CreateProjectDialog';

export default function ProjectListPage() {
  const navigate              = useNavigate();
  const user                  = useAppSelector(selectUser);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: projects = [], isLoading } = useGetProjectsQuery();

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Projects</Typography>
        {user?.role === 'Admin' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            New project
          </Button>
        )}
      </Box>

      {projects.length === 0 ? (
        <Typography color="text.secondary">No projects yet.</Typography>
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid key={project.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardActionArea onClick={() => navigate(`/projects/${project.id}`)}>
                  <CardContent>
                    <Typography variant="h6">{project.name}</Typography>
                    {project.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {project.description}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <CreateProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}
