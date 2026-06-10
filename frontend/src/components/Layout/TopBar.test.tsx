import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TopBar from './TopBar';
import * as authApiHooks from '../../services/authApi';
import authReducer, { setUser } from '../../features/auth/authSlice';
import { api } from '../../services/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/authApi', () => ({
  useLogoutMutation: jest.fn(),
}));

function makeStore(user: { id: string; username: string; role: 'User' | 'Admin' } | null = null) {
  const store = configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
  if (user) store.dispatch(setUser(user));
  return store;
}

function renderTopBar(user: { id: string; username: string; role: 'User' | 'Admin' } | null = null) {
  return render(
    <Provider store={makeStore(user)}>
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    </Provider>
  );
}

describe('TopBar', () => {
  const mockLogoutFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (authApiHooks.useLogoutMutation as jest.Mock).mockReturnValue([
      mockLogoutFn,
      { isLoading: false },
    ]);
  });

  it('renders the application title', () => {
    renderTopBar();
    expect(screen.getByText('Project Management System')).toBeInTheDocument();
  });

  it('shows username and role when authenticated', () => {
    renderTopBar({ id: '1', username: 'alice', role: 'Admin' });
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin/i)).toBeInTheDocument();
  });

  it('shows the logout button when authenticated', () => {
    renderTopBar({ id: '1', username: 'alice', role: 'User' });
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('hides the logout button when not authenticated', () => {
    renderTopBar(null);
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('calls logout mutation and navigates to /login on logout click', async () => {
    mockLogoutFn.mockReturnValue({ unwrap: () => Promise.resolve() });
    renderTopBar({ id: '1', username: 'alice', role: 'User' });

    await userEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(mockLogoutFn).toHaveBeenCalled();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
  });
});
