import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useGetMeQuery } from '../services/authApi';
import { useAppDispatch } from '../app/hooks';
import { setUser } from '../features/auth/authSlice';

interface Props {
  children: React.ReactNode;
}

export default function AppInitializer({ children }: Props) {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useGetMeQuery();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (data) dispatch(setUser(data));
      setAuthChecked(true);
    }
  }, [isLoading, data, dispatch]);

  if (!authChecked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
