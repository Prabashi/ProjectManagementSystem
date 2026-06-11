import { render, screen } from '@testing-library/react';
import KanbanColumn from './KanbanColumn';
import type { Ticket } from '../../types';

const tickets: Ticket[] = [
  { id: 't1', projectId: 'p1', subject: 'Bug fix',   status: 'ToDo', boardOrder: 0, createdByUserId: 'u1', createdAt: '', updatedAt: '' },
  { id: 't2', projectId: 'p1', subject: 'Write docs', status: 'ToDo', boardOrder: 1, createdByUserId: 'u1', createdAt: '', updatedAt: '' },
];

describe('KanbanColumn', () => {
  it('renders the column status label', () => {
    render(<KanbanColumn status="ToDo" tickets={[]} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('renders a count chip with the number of tickets', () => {
    render(<KanbanColumn status="ToDo" tickets={tickets} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders a TicketCard for each ticket', () => {
    render(<KanbanColumn status="ToDo" tickets={tickets} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Bug fix')).toBeInTheDocument();
    expect(screen.getByText('Write docs')).toBeInTheDocument();
  });

  it('shows "No tickets" when the column is empty', () => {
    render(<KanbanColumn status="Done" tickets={[]} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('No tickets')).toBeInTheDocument();
  });

  it('shows delete button only for Admin', () => {
    render(<KanbanColumn status="ToDo" tickets={tickets} isAdmin={true} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2);
  });
});
