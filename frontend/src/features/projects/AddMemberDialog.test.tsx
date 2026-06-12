import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AddMemberDialog from './AddMemberDialog';
import * as projectsApiHooks from '../../services/projectsApi';
import * as usersApiHooks from '../../services/usersApi';
import authReducer from '../auth/authSlice';
import { api } from '../../services/api';

jest.mock('../../services/projectsApi', () => ({
  useAddProjectMemberMutation: jest.fn(),
  useGetProjectMembersQuery:   jest.fn(),
}));

jest.mock('../../services/usersApi', () => ({
  useGetUsersQuery: jest.fn(),
}));

const allUsers   = [
  { id: 'u1', username: 'alice', role: 'Admin' as const },
  { id: 'u2', username: 'bob',   role: 'User'  as const },
];
const existingMembers = [{ userId: 'u1', username: 'alice', role: 'Admin', addedAt: '' }];

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
        <AddMemberDialog projectId="p1" open onClose={onClose} />
      </MemoryRouter>
    </Provider>
  );
}

describe('AddMemberDialog', () => {
  const mockAddMemberFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usersApiHooks.useGetUsersQuery as jest.Mock).mockReturnValue({ data: allUsers });
    (projectsApiHooks.useGetProjectMembersQuery as jest.Mock).mockReturnValue({ data: existingMembers });
    (projectsApiHooks.useAddProjectMemberMutation as jest.Mock).mockReturnValue([mockAddMemberFn, { isLoading: false }]);
  });

  it('renders a user dropdown filtered to non-members', () => {
    renderDialog();
    // alice is already a member — only bob should be available
    expect(screen.getByRole('combobox', { name: /user/i })).toBeInTheDocument();
  });

  it('calls addMember with the selected user on submit', async () => {
    mockAddMemberFn.mockReturnValue({ unwrap: () => Promise.resolve() });
    renderDialog();

    // Open the select dropdown and pick bob
    await userEvent.click(screen.getByRole('combobox', { name: /user/i }));
    await userEvent.click(screen.getByRole('option', { name: /bob/i }));
    await userEvent.click(screen.getByRole('button', { name: /add member/i }));

    expect(mockAddMemberFn).toHaveBeenCalledWith({ projectId: 'p1', userId: 'u2' });
  });

  it('calls onClose after successful add', async () => {
    const onClose = jest.fn();
    mockAddMemberFn.mockReturnValue({ unwrap: () => Promise.resolve() });
    renderDialog(onClose);

    await userEvent.click(screen.getByRole('combobox', { name: /user/i }));
    await userEvent.click(screen.getByRole('option', { name: /bob/i }));
    await userEvent.click(screen.getByRole('button', { name: /add member/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

});
