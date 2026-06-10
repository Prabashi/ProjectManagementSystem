import { useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { useLogoutMutation } from '../../services/authApi';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { clearUser, selectUser } from '../../features/auth/authSlice';

export default function TopBar() {
  const user     = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try { await logout().unwrap(); } catch { /* cookie cleared server-side even on error */ }
    dispatch(clearUser());
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/projects')}>
          Project Management System
        </Typography>
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">{user.username} ({user.role})</Typography>
            <Button color="inherit" onClick={handleLogout} aria-label="logout">
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
