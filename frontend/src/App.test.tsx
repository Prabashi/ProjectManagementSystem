import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from './App';
import authReducer from './features/auth/authSlice';
import { api } from './services/api';

jest.mock('./services/authApi', () => ({
  useGetMeQuery: () => ({ data: undefined, isLoading: false }),
  useLoginMutation: () => [jest.fn(), { isLoading: false }],
  useRegisterMutation: () => [jest.fn(), { isLoading: false }],
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

function renderApp(initialPath = '/') {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </Provider>
  );
}

describe('App', () => {
  it('redirects unauthenticated users from / to the login page', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the login page at /login', () => {
    renderApp('/login');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the register page at /register', () => {
    renderApp('/register');
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });
});
