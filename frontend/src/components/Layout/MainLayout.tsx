import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

export default function MainLayout() {
  return (
    <>
      <TopBar />
      <Box component="main" sx={{ p: 3 }}>
        <Outlet />
      </Box>
    </>
  );
}
