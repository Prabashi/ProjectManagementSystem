import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProjectListPage from './ProjectListPage';
import * as projectsApiHooks from '../../services/projectsApi';
import authReducer, { setUser } from '../auth/authSlice';
import { api } from '../../services/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/projectsApi', () => ({
  useGetProjectsQuery: jest.fn(),
  useCreateProjectMutation: jest.fn(),
}));

const projects = [
  { id: 'p1', name: 'Alpha', description: 'First', createdByUserId: 'u1', createdAt: '', updatedAt: '' },
  { id: 'p2', name: 'Beta',  description: '',      createdByUserId: 'u1', createdAt: '', updatedAt: '' },
];

function makeStore(role: 'User' | 'Admin' = 'User') {
  const store = configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
  store.dispatch(setUser({ id: 'u1', username: 'alice', role }));
  return store;
}

function renderPage(role: 'User' | 'Admin' = 'User') {
  return render(
    <Provider store={makeStore(role)}>
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('ProjectListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (projectsApiHooks.useGetProjectsQuery as jest.Mock).mockReturnValue({ data: projects, isLoading: false });
    (projectsApiHooks.useCreateProjectMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  it('renders the list of projects', () => {
    renderPage();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows "New project" button for Admin users', () => {
    renderPage('Admin');
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
  });

  it('hides "New project" button for non-Admin users', () => {
    renderPage('User');
    expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument();
  });

  it('shows a loading spinner while fetching', () => {
    (projectsApiHooks.useGetProjectsQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when there are no projects', () => {
    (projectsApiHooks.useGetProjectsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    renderPage();
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it('navigates to project detail page on card click', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Alpha'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });
});
