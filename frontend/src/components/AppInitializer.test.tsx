import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AppInitializer from './AppInitializer';
import * as authApiHooks from '../services/authApi';
import authReducer, { selectUser } from '../features/auth/authSlice';
import { api } from '../services/api';

jest.mock('../services/authApi', () => ({
  useGetMeQuery: jest.fn(),
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

describe('AppInitializer', () => {
  it('shows a spinner while the session check is in progress', () => {
    (authApiHooks.useGetMeQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    render(
      <Provider store={makeStore()}>
        <AppInitializer><div>App Content</div></AppInitializer>
      </Provider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('App Content')).not.toBeInTheDocument();
  });

  it('renders children after the session check resolves with an active session', async () => {
    (authApiHooks.useGetMeQuery as jest.Mock).mockReturnValue({
      data: { id: '1', username: 'alice', role: 'User' },
      isLoading: false,
    });
    render(
      <Provider store={makeStore()}>
        <AppInitializer><div>App Content</div></AppInitializer>
      </Provider>
    );
    expect(await screen.findByText('App Content')).toBeInTheDocument();
  });

  it('renders children after the session check resolves with no session', async () => {
    (authApiHooks.useGetMeQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(
      <Provider store={makeStore()}>
        <AppInitializer><div>App Content</div></AppInitializer>
      </Provider>
    );
    expect(await screen.findByText('App Content')).toBeInTheDocument();
  });

  it('dispatches setUser when the server returns an active session', async () => {
    const user = { id: '1', username: 'alice', role: 'User' as const };
    (authApiHooks.useGetMeQuery as jest.Mock).mockReturnValue({ data: user, isLoading: false });
    const store = makeStore();
    render(
      <Provider store={store}>
        <AppInitializer><div>App Content</div></AppInitializer>
      </Provider>
    );
    await screen.findByText('App Content');
    expect(selectUser(store.getState())).toEqual(user);
  });

  it('leaves user as null when there is no active session', async () => {
    (authApiHooks.useGetMeQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    const store = makeStore();
    render(
      <Provider store={store}>
        <AppInitializer><div>App Content</div></AppInitializer>
      </Provider>
    );
    await screen.findByText('App Content');
    expect(selectUser(store.getState())).toBeNull();
  });
});
