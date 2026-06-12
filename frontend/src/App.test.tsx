import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from './App';
import authReducer, { setUser } from './features/auth/authSlice';
import notificationReducer from './app/notificationSlice';
import { api } from './services/api';

jest.mock('./services/authApi', () => ({
  useGetMeQuery:      () => ({ data: undefined, isLoading: false }),
  useLoginMutation:   () => [jest.fn(), { isLoading: false }],
  useRegisterMutation: () => [jest.fn(), { isLoading: false }],
  useLogoutMutation:  () => [jest.fn(), { isLoading: false }],
}));

jest.mock('./services/projectsApi', () => ({
  useGetProjectsQuery:        () => ({ data: [], isLoading: false }),
  useCreateProjectMutation:   () => [jest.fn(), { isLoading: false }],
  useGetProjectByIdQuery:     () => ({ data: undefined, isLoading: false }),
  useGetProjectMembersQuery:  () => ({ data: [], isLoading: false }),
  useAddProjectMemberMutation: () => [jest.fn(), { isLoading: false }],
}));

jest.mock('./services/usersApi', () => ({
  useGetUsersQuery: () => ({ data: [] }),
}));

function makeStore(authenticated = false) {
  const store = configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer, notification: notificationReducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
  if (authenticated) {
    store.dispatch(setUser({ id: 'u1', username: 'alice', role: 'Admin' }));
  }
  return store;
}

function renderApp(initialPath = '/', authenticated = false) {
  return render(
    <Provider store={makeStore(authenticated)}>
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

  it('renders the project list page at /projects for authenticated users', () => {
    renderApp('/projects', true);
    expect(screen.getByRole('heading', { name: /^projects$/i })).toBeInTheDocument();
  });

  it('redirects authenticated users from / to /projects', () => {
    renderApp('/', true);
    expect(screen.getByRole('heading', { name: /^projects$/i })).toBeInTheDocument();
  });
});
