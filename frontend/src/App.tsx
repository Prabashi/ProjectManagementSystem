import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import PrivateRoute from './components/Layout/PrivateRoute';
import AppInitializer from './components/AppInitializer';

export default function App() {
  return (
    <AppInitializer>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<PrivateRoute />}>
          <Route
            path="/"
            element={
              <Box sx={{ p: 4 }}>
                <Typography variant="h4">Project Management System</Typography>
              </Box>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppInitializer>
  );
}
