import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CreateSprintDialog from './CreateSprintDialog';
import * as sprintsApiHooks from '../../services/sprintsApi';
import authReducer from '../auth/authSlice';
import { api } from '../../services/api';

jest.mock('../../services/sprintsApi', () => ({
  useCreateSprintMutation: jest.fn(),
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
        <CreateSprintDialog projectId="p1" open onClose={onClose} />
      </MemoryRouter>
    </Provider>
  );
}

describe('CreateSprintDialog', () => {
  const mockCreateFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (sprintsApiHooks.useCreateSprintMutation as jest.Mock).mockReturnValue([
      mockCreateFn,
      { isLoading: false, error: undefined },
    ]);
  });

  it('renders the name and date fields', () => {
    renderDialog();
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it('calls createSprint with entered values on submit', async () => {
    mockCreateFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: 's1', name: 'Sprint 1' }) });
    renderDialog();

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Sprint 1');
    await userEvent.click(screen.getByRole('button', { name: /create sprint/i }));

    expect(mockCreateFn).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', name: 'Sprint 1' })
    );
  });

  it('calls onClose after successful creation', async () => {
    const onClose = jest.fn();
    mockCreateFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: 's1', name: 'Sprint 1' }) });
    renderDialog(onClose);

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Sprint 1');
    await userEvent.click(screen.getByRole('button', { name: /create sprint/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows error message on failure', () => {
    (sprintsApiHooks.useCreateSprintMutation as jest.Mock).mockReturnValue([
      mockCreateFn,
      { isLoading: false, error: { status: 400, data: { title: 'Name is required' } } },
    ]);
    renderDialog();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('disables the submit button while loading', () => {
    (sprintsApiHooks.useCreateSprintMutation as jest.Mock).mockReturnValue([
      mockCreateFn,
      { isLoading: true, error: undefined },
    ]);
    renderDialog();
    expect(screen.getByRole('button', { name: /create sprint/i })).toBeDisabled();
  });
});
