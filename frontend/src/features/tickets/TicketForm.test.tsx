import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TicketForm from './TicketForm';
import * as ticketsApiHooks from '../../services/ticketsApi';
import authReducer from '../auth/authSlice';
import { api } from '../../services/api';
import type { Ticket } from '../../types';

jest.mock('../../services/ticketsApi', () => ({
  useCreateTicketMutation: jest.fn(),
  useUpdateTicketMutation: jest.fn(),
}));

jest.mock('../../services/sprintsApi', () => ({
  useGetSprintsQuery: () => ({ data: [{ id: 's1', name: 'Sprint 1', isActive: true }] }),
}));

jest.mock('../../services/projectsApi', () => ({
  useGetProjectMembersQuery: () => ({
    data: [{ userId: 'u1', username: 'alice', role: 'Admin' }],
  }),
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

function renderForm(ticket?: Ticket, onClose = jest.fn()) {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <TicketForm projectId="p1" ticket={ticket} open onClose={onClose} />
      </MemoryRouter>
    </Provider>
  );
}

describe('TicketForm', () => {
  const mockCreateFn = jest.fn();
  const mockUpdateFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (ticketsApiHooks.useCreateTicketMutation as jest.Mock).mockReturnValue([mockCreateFn, { isLoading: false, error: undefined }]);
    (ticketsApiHooks.useUpdateTicketMutation as jest.Mock).mockReturnValue([mockUpdateFn, { isLoading: false, error: undefined }]);
  });

  it('renders "New ticket" title in create mode', () => {
    renderForm();
    expect(screen.getByText('New ticket')).toBeInTheDocument();
  });

  it('renders "Edit ticket" title in edit mode', () => {
    renderForm({ id: 't1', projectId: 'p1', subject: 'Old', status: 'ToDo', boardOrder: 0, createdByUserId: 'u1', createdAt: '', updatedAt: '' });
    expect(screen.getByText('Edit ticket')).toBeInTheDocument();
  });

  it('calls createTicket on submit in create mode', async () => {
    mockCreateFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: 't1' }) });
    renderForm();

    await userEvent.type(screen.getByRole('textbox', { name: /subject/i }), 'New ticket');
    await userEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    expect(mockCreateFn).toHaveBeenCalledWith(expect.objectContaining({ subject: 'New ticket', projectId: 'p1' }));
  });

  it('calls updateTicket on submit in edit mode', async () => {
    mockUpdateFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: 't1' }) });
    renderForm({ id: 't1', projectId: 'p1', subject: 'Old', status: 'ToDo', boardOrder: 0, createdByUserId: 'u1', createdAt: '', updatedAt: '' });

    await userEvent.click(screen.getByRole('button', { name: /save ticket/i }));

    expect(mockUpdateFn).toHaveBeenCalledWith(expect.objectContaining({ ticketId: 't1', projectId: 'p1' }));
  });

  it('calls onClose after successful creation', async () => {
    const onClose = jest.fn();
    mockCreateFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: 't1' }) });
    renderForm(undefined, onClose);

    await userEvent.type(screen.getByRole('textbox', { name: /subject/i }), 'New ticket');
    await userEvent.click(screen.getByRole('button', { name: /create ticket/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows error message on failure', () => {
    (ticketsApiHooks.useCreateTicketMutation as jest.Mock).mockReturnValue([
      mockCreateFn,
      { isLoading: false, error: { status: 400, data: { title: 'Subject is required' } } },
    ]);
    renderForm();
    expect(screen.getByText('Subject is required')).toBeInTheDocument();
  });

  it('disables submit button while loading', () => {
    (ticketsApiHooks.useCreateTicketMutation as jest.Mock).mockReturnValue([
      mockCreateFn,
      { isLoading: true, error: undefined },
    ]);
    renderForm();
    expect(screen.getByRole('button', { name: /create ticket/i })).toBeDisabled();
  });
});
