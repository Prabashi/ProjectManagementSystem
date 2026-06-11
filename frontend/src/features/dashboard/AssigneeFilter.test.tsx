import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssigneeFilter from './AssigneeFilter';
import type { ProjectMember } from '../../types';

const members: ProjectMember[] = [
  { userId: 'u1', username: 'alice', role: 'Admin', addedAt: '' },
  { userId: 'u2', username: 'bob',   role: 'User',  addedAt: '' },
];

describe('AssigneeFilter', () => {
  it('renders all options when opened', async () => {
    render(<AssigneeFilter members={members} value="" onChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'All members' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'alice' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'bob' })).toBeInTheDocument();
  });

  it('calls onChange with the selected user ID', async () => {
    const onChange = jest.fn();
    render(<AssigneeFilter members={members} value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'alice' }));
    expect(onChange).toHaveBeenCalledWith('u1');
  });

  it('calls onChange with empty string when "All members" is selected', async () => {
    const onChange = jest.fn();
    render(<AssigneeFilter members={members} value="u1" onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'All members' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
