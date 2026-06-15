import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LoginPage from './LoginPage';
import * as authApiHooks from '../../services/authApi';
import authReducer from './authSlice';
import { api } from '../../services/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/authApi', () => ({
  useLoginMutation: jest.fn(),
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

function renderLogin() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('LoginPage', () => {
  const mockLoginFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (authApiHooks.useLoginMutation as jest.Mock).mockReturnValue([mockLoginFn, { isLoading: false }]);
  });

  it('renders username, password fields and submit button', () => {
    renderLogin();
    expect(screen.getByRole('textbox', { name: /username/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls login with entered credentials on submit', async () => {
    mockLoginFn.mockReturnValue({
      unwrap: () => Promise.resolve({ id: '1', username: 'alice', role: 'User' }),
    });
    renderLogin();

    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLoginFn).toHaveBeenCalledWith({ username: 'alice', password: 'password123' });
  });

  it('navigates to / after successful login', async () => {
    mockLoginFn.mockReturnValue({
      unwrap: () => Promise.resolve({ id: '1', username: 'alice', role: 'User' }),
    });
    renderLogin();

    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('disables the submit button while loading', () => {
    (authApiHooks.useLoginMutation as jest.Mock).mockReturnValue([mockLoginFn, { isLoading: true }]);
    renderLogin();

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('shows validation errors when submitting empty fields', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockLoginFn).not.toHaveBeenCalled();
  });

  it('clears field error when the user starts typing', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'a');
    expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
  });

  it('shows a link to the register page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /create one/i })).toBeInTheDocument();
  });
});
