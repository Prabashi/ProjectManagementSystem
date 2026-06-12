import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RegisterPage from './RegisterPage';
import * as authApiHooks from '../../services/authApi';
import authReducer from './authSlice';
import { api } from '../../services/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/authApi', () => ({
  useRegisterMutation: jest.fn(),
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

function renderRegister() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('RegisterPage', () => {
  const mockRegisterFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (authApiHooks.useRegisterMutation as jest.Mock).mockReturnValue([mockRegisterFn, { isLoading: false }]);
  });

  it('renders username, password, role fields and submit button', () => {
    renderRegister();
    expect(screen.getByRole('textbox', { name: /username/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls register with entered values on submit', async () => {
    mockRegisterFn.mockReturnValue({
      unwrap: () => Promise.resolve({ id: '1', username: 'bob', role: 'User' }),
    });
    renderRegister();

    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'bob');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockRegisterFn).toHaveBeenCalledWith({
      username: 'bob',
      password: 'password123',
      role: 'User',
    });
  });

  it('navigates to / after successful registration', async () => {
    mockRegisterFn.mockReturnValue({
      unwrap: () => Promise.resolve({ id: '1', username: 'bob', role: 'User' }),
    });
    renderRegister();

    await userEvent.type(screen.getByRole('textbox', { name: /username/i }), 'bob');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('disables the submit button while loading', () => {
    (authApiHooks.useRegisterMutation as jest.Mock).mockReturnValue([mockRegisterFn, { isLoading: true }]);
    renderRegister();

    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('shows a link to the login page', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });
});
