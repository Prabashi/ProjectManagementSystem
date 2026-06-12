import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CreateProjectDialog from './CreateProjectDialog';
import * as projectsApiHooks from '../../services/projectsApi';
import authReducer from '../auth/authSlice';
import { api } from '../../services/api';

jest.mock('../../services/projectsApi', () => ({
  useCreateProjectMutation: jest.fn(),
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

function renderDialog(onClose = jest.fn()) {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <CreateProjectDialog open onClose={onClose} />
      </MemoryRouter>
    </Provider>
  );
}

describe('CreateProjectDialog', () => {
  const mockCreateFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsApiHooks.useCreateProjectMutation as jest.Mock).mockReturnValue([mockCreateFn, { isLoading: false }]);
  });

  it('renders name and description fields', () => {
    renderDialog();
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
  });

  it('calls createProject with entered values on submit', async () => {
    mockCreateFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: '1', name: 'Alpha' }) });
    renderDialog();

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Alpha');
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc');
    await userEvent.click(screen.getByRole('button', { name: /create project/i }));

    expect(mockCreateFn).toHaveBeenCalledWith({ name: 'Alpha', description: 'Desc' });
  });

  it('calls onClose after successful creation', async () => {
    const onClose = jest.fn();
    mockCreateFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: '1', name: 'Alpha' }) });
    renderDialog(onClose);

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Alpha');
    await userEvent.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('disables the submit button while loading', () => {
    (projectsApiHooks.useCreateProjectMutation as jest.Mock).mockReturnValue([mockCreateFn, { isLoading: true }]);
    renderDialog();
    expect(screen.getByRole('button', { name: /create project/i })).toBeDisabled();
  });
});
