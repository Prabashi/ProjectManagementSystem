import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProjectDetailPage from './ProjectDetailPage';
import * as projectsApiHooks from '../../services/projectsApi';
import authReducer, { setUser } from '../auth/authSlice';
import { api } from '../../services/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/projectsApi', () => ({
  useGetProjectByIdQuery:     jest.fn(),
  useGetProjectMembersQuery:  jest.fn(),
  useAddProjectMemberMutation: jest.fn(),
}));

jest.mock('../../services/usersApi', () => ({
  useGetUsersQuery: () => ({ data: [] }),
}));

jest.mock('../../services/sprintsApi', () => ({
  useGetSprintsQuery:         () => ({ data: [], isLoading: false }),
  useCreateSprintMutation:    () => [jest.fn(), { isLoading: false }],
  useSetActiveSprintMutation: () => [jest.fn(), { isLoading: false }],
  useDeleteSprintMutation:    () => [jest.fn(), { isLoading: false }],
}));

jest.mock('../../services/ticketsApi', () => ({
  useGetTicketsQuery:      () => ({ data: [], isLoading: false }),
  useCreateTicketMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateTicketMutation: () => [jest.fn(), { isLoading: false }],
  useDeleteTicketMutation: () => [jest.fn(), { isLoading: false }],
}));

const project = { id: 'p1', name: 'Alpha', description: 'First project', createdByUserId: 'u1', createdAt: '', updatedAt: '' };
const members = [
  { userId: 'u1', username: 'alice', role: 'Admin', addedAt: '' },
  { userId: 'u2', username: 'bob',   role: 'User',  addedAt: '' },
];

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
      <MemoryRouter initialEntries={['/projects/p1']}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (projectsApiHooks.useGetProjectByIdQuery as jest.Mock).mockReturnValue({ data: project, isLoading: false });
    (projectsApiHooks.useGetProjectMembersQuery as jest.Mock).mockReturnValue({ data: members, isLoading: false });
    (projectsApiHooks.useAddProjectMemberMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  it('renders the project name and description', () => {
    renderPage();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('First project')).toBeInTheDocument();
  });

  it('renders the Members tab by default with member list', () => {
    renderPage();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('shows "Add member" button for Admin users', () => {
    renderPage('Admin');
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
  });

  it('hides "Add member" button for non-Admin users', () => {
    renderPage('User');
    expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument();
  });

  it('shows loading spinner while fetching project', () => {
    (projectsApiHooks.useGetProjectByIdQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('switches to Sprints tab and shows SprintPanel', async () => {
    renderPage('Admin');
    await userEvent.click(screen.getByRole('tab', { name: /sprints/i }));
    expect(screen.getByRole('button', { name: /new sprint/i })).toBeInTheDocument();
  });
});
