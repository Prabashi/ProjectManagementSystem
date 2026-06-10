import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MainLayout from './MainLayout';
import authReducer from '../../features/auth/authSlice';
import { api } from '../../services/api';

jest.mock('../../services/authApi', () => ({
  useLogoutMutation: () => [jest.fn(), { isLoading: false }],
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

describe('MainLayout', () => {
  it('renders the top bar and outlet content', () => {
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>Page Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText('Project Management System')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });
});
