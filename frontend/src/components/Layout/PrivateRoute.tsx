import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../../features/auth/authSlice';

export default function PrivateRoute() {
  const user = useAppSelector(selectUser);
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
