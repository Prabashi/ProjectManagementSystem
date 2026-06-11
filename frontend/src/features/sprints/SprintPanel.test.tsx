import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SprintPanel from './SprintPanel';
import * as sprintsApiHooks from '../../services/sprintsApi';
import authReducer from '../auth/authSlice';
import { api } from '../../services/api';

jest.mock('../../services/sprintsApi', () => ({
  useGetSprintsQuery:        jest.fn(),
  useCreateSprintMutation:   jest.fn(),
  useSetActiveSprintMutation: jest.fn(),
  useDeleteSprintMutation:   jest.fn(),
}));

const sprints = [
  { id: 's1', projectId: 'p1', name: 'Sprint 1', startDate: '2026-01-01', endDate: '2026-01-14', isActive: true,  createdAt: '' },
  { id: 's2', projectId: 'p1', name: 'Sprint 2', startDate: null,         endDate: null,          isActive: false, createdAt: '' },
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
        <SprintPanel projectId="p1" isAdmin={isAdmin} />
      </MemoryRouter>
    </Provider>
  );
}

describe('SprintPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sprintsApiHooks.useGetSprintsQuery as jest.Mock).mockReturnValue({ data: sprints, isLoading: false });
    (sprintsApiHooks.useCreateSprintMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (sprintsApiHooks.useSetActiveSprintMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (sprintsApiHooks.useDeleteSprintMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  it('renders the list of sprints', () => {
    renderPanel();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  it('shows Active chip on the active sprint', () => {
    renderPanel();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows the date range for sprints that have dates', () => {
    renderPanel();
    expect(screen.getByText('2026-01-01 → 2026-01-14')).toBeInTheDocument();
  });

  it('shows "No dates set" for sprints without dates', () => {
    renderPanel();
    expect(screen.getByText('No dates set')).toBeInTheDocument();
  });

  it('shows "New sprint" button for Admin users', () => {
    renderPanel(true);
    expect(screen.getByRole('button', { name: /new sprint/i })).toBeInTheDocument();
  });

  it('hides "New sprint" button for non-Admin users', () => {
    renderPanel(false);
    expect(screen.queryByRole('button', { name: /new sprint/i })).not.toBeInTheDocument();
  });

  it('disables "Set active" on the already-active sprint', () => {
    renderPanel(true);
    const activeButton = screen.getByRole('button', { name: /set sprint 1 active/i });
    expect(activeButton).toBeDisabled();
  });

  it('calls setActive mutation when "Set active" is clicked on inactive sprint', async () => {
    const mockSetActive = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    (sprintsApiHooks.useSetActiveSprintMutation as jest.Mock).mockReturnValue([mockSetActive, { isLoading: false }]);
    renderPanel(true);

    await userEvent.click(screen.getByRole('button', { name: /set sprint 2 active/i }));

    expect(mockSetActive).toHaveBeenCalledWith({ projectId: 'p1', sprintId: 's2' });
  });

  it('calls deleteSprint mutation when delete button is clicked', async () => {
    const mockDelete = jest.fn();
    (sprintsApiHooks.useDeleteSprintMutation as jest.Mock).mockReturnValue([mockDelete, { isLoading: false }]);
    renderPanel(true);

    await userEvent.click(screen.getByRole('button', { name: /delete sprint 2/i }));

    expect(mockDelete).toHaveBeenCalledWith({ projectId: 'p1', sprintId: 's2' });
  });

  it('shows loading spinner while fetching', () => {
    (sprintsApiHooks.useGetSprintsQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    renderPanel();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when there are no sprints', () => {
    (sprintsApiHooks.useGetSprintsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    renderPanel();
    expect(screen.getByText(/no sprints yet/i)).toBeInTheDocument();
  });
});
