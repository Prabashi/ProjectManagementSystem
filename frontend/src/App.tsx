import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import PrivateRoute from './components/Layout/PrivateRoute';
import MainLayout from './components/Layout/MainLayout';
import AppInitializer from './components/AppInitializer';
import ProjectListPage from './features/projects/ProjectListPage';
import ProjectDetailPage from './features/projects/ProjectDetailPage';
import DashboardPage from './features/dashboard/DashboardPage';

export default function App() {
  return (
    <AppInitializer>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<Navigate to="/projects" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppInitializer>
  );
}
