import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TicketListPanel from './TicketListPanel';
import * as ticketsApiHooks from '../../services/ticketsApi';
import authReducer from '../auth/authSlice';
import { api } from '../../services/api';
import type { Ticket } from '../../types';

jest.mock('../../services/ticketsApi', () => ({
  useGetTicketsQuery:      jest.fn(),
  useDeleteTicketMutation: jest.fn(),
  useCreateTicketMutation: jest.fn(),
  useUpdateTicketMutation: jest.fn(),
}));

jest.mock('../../services/sprintsApi', () => ({
  useGetSprintsQuery: () => ({ data: [{ id: 's1', name: 'Sprint 1', isActive: true }] }),
}));

jest.mock('../../services/projectsApi', () => ({
  useGetProjectMembersQuery: () => ({ data: [] }),
}));

const tickets: Ticket[] = [
  { id: 't1', projectId: 'p1', sprintId: 's1', subject: 'Bug fix',    status: 'ToDo',       boardOrder: 0, assigneeName: 'alice', createdByUserId: 'u1', createdAt: '', updatedAt: '' },
  { id: 't2', projectId: 'p1', sprintId: null,  subject: 'Write docs', status: 'InProgress', boardOrder: 0, assigneeName: null,    createdByUserId: 'u1', createdAt: '', updatedAt: '' },
];

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
}

function renderPanel(isAdmin = false) {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <TicketListPanel projectId="p1" isAdmin={isAdmin} />
      </MemoryRouter>
    </Provider>
  );
}

describe('TicketListPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ticketsApiHooks.useGetTicketsQuery as jest.Mock).mockReturnValue({ data: tickets, isLoading: false });
    (ticketsApiHooks.useDeleteTicketMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (ticketsApiHooks.useCreateTicketMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (ticketsApiHooks.useUpdateTicketMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  it('renders all tickets by default', () => {
    renderPanel();
    expect(screen.getByText('Bug fix')).toBeInTheDocument();
    expect(screen.getByText('Write docs')).toBeInTheDocument();
  });

  it('shows the "New ticket" button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /new ticket/i })).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (ticketsApiHooks.useGetTicketsQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderPanel();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when no tickets match filter', () => {
    (ticketsApiHooks.useGetTicketsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    renderPanel();
    expect(screen.getByText(/no tickets found/i)).toBeInTheDocument();
  });

  it('calls deleteTicket mutation when delete is clicked (Admin)', async () => {
    const mockDelete = jest.fn();
    (ticketsApiHooks.useDeleteTicketMutation as jest.Mock).mockReturnValue([mockDelete, { isLoading: false }]);
    renderPanel(true);

    await userEvent.click(screen.getByRole('button', { name: /delete bug fix/i }));

    expect(mockDelete).toHaveBeenCalledWith({ projectId: 'p1', ticketId: 't1' });
  });

  it('opens the create form when "New ticket" is clicked', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /new ticket/i }));
    expect(screen.getByRole('button', { name: /create ticket/i })).toBeInTheDocument();
  });
});
