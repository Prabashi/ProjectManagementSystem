import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DashboardPage from './DashboardPage';
import * as dashboardApiHooks from '../../services/dashboardApi';
import * as projectsApiHooks  from '../../services/projectsApi';
import * as ticketsApiHooks   from '../../services/ticketsApi';
import authReducer, { setUser } from '../auth/authSlice';
import { api } from '../../services/api';

jest.mock('../../services/dashboardApi', () => ({
  useGetDashboardQuery:      jest.fn(),
  useCreateDashboardMutation: jest.fn(),
}));

jest.mock('../../services/projectsApi', () => ({
  useGetProjectMembersQuery: jest.fn(),
}));

jest.mock('../../services/ticketsApi', () => ({
  useDeleteTicketMutation: jest.fn(),
  useCreateTicketMutation: jest.fn(),
  useUpdateTicketMutation: jest.fn(),
}));

jest.mock('../../services/sprintsApi', () => ({
  useGetSprintsQuery: () => ({ data: [] }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function makeStore(role: 'User' | 'Admin' = 'Admin') {
  const store = configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
  store.dispatch(setUser({ id: 'u1', username: 'alice', role }));
  return store;
}

function renderPage(role: 'User' | 'Admin' = 'Admin') {
  return render(
    <Provider store={makeStore(role)}>
      <MemoryRouter initialEntries={['/projects/p1/dashboard']}>
        <Routes>
          <Route path="/projects/:id/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

const dashboard = {
  id: 'd1', projectId: 'p1', name: 'Project Board',
  createdByUserId: 'u1', createdAt: '',
  activeSprintId: 'sp1', tickets: [],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (dashboardApiHooks.useCreateDashboardMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (projectsApiHooks.useGetProjectMembersQuery as jest.Mock).mockReturnValue({ data: [] });
    (ticketsApiHooks.useDeleteTicketMutation as jest.Mock).mockReturnValue([jest.fn(), {}]);
    (ticketsApiHooks.useCreateTicketMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (ticketsApiHooks.useUpdateTicketMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  it('shows loading spinner while fetching', () => {
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({ isLoading: true, isError: false });
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows "Create Dashboard" button for Admin when no dashboard', () => {
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: { status: 404 },
    });
    renderPage('Admin');
    expect(screen.getByRole('button', { name: /create dashboard/i })).toBeInTheDocument();
  });

  it('hides "Create Dashboard" button for non-Admin when no dashboard', () => {
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: { status: 404 },
    });
    renderPage('User');
    expect(screen.queryByRole('button', { name: /create dashboard/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no dashboard/i)).toBeInTheDocument();
  });

  it('renders the dashboard name when dashboard exists', () => {
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({ data: dashboard, isLoading: false, isError: false });
    renderPage();
    expect(screen.getByText('Project Board')).toBeInTheDocument();
  });

  it('shows "no active sprint" message when activeSprintId is null', () => {
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({
      data: { ...dashboard, activeSprintId: null },
      isLoading: false, isError: false,
    });
    renderPage();
    expect(screen.getByText(/no active sprint/i)).toBeInTheDocument();
  });

  it('renders the Kanban board when active sprint exists', () => {
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({ data: dashboard, isLoading: false, isError: false });
    renderPage();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('opens the create dialog when "Create Dashboard" is clicked', async () => {
    (dashboardApiHooks.useGetDashboardQuery as jest.Mock).mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: { status: 404 },
    });
    renderPage('Admin');
    await userEvent.click(screen.getByRole('button', { name: /create dashboard/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
