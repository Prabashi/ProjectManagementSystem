import { render, screen } from '@testing-library/react';
import KanbanBoard from './KanbanBoard';
import type { Ticket } from '../../types';

const tickets: Ticket[] = [
  { id: 't1', projectId: 'p1', subject: 'Alpha', status: 'ToDo',       boardOrder: 0, createdByUserId: 'u1', createdAt: '', updatedAt: '' },
  { id: 't2', projectId: 'p1', subject: 'Beta',  status: 'InProgress', boardOrder: 0, createdByUserId: 'u1', createdAt: '', updatedAt: '' },
  { id: 't3', projectId: 'p1', subject: 'Gamma', status: 'Done',       boardOrder: 0, createdByUserId: 'u1', createdAt: '', updatedAt: '' },
];

describe('KanbanBoard', () => {
  it('renders all six status columns', () => {
    render(<KanbanBoard tickets={[]} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('In Review')).toBeInTheDocument();
    expect(screen.getByText('To Deploy')).toBeInTheDocument();
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('places tickets in their respective columns', () => {
    render(<KanbanBoard tickets={tickets} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('passes isAdmin down to columns', () => {
    render(<KanbanBoard tickets={tickets} isAdmin={true} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(3);
  });
});
