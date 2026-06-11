import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import TicketCard from './TicketCard';
import type { Ticket } from '../../types';

const ticket: Ticket = {
  id: 't1',
  projectId: 'p1',
  subject: 'Fix login bug',
  description: null,
  estimate: 3,
  assigneeId: 'u1',
  assigneeName: 'alice',
  status: 'InProgress',
  boardOrder: 0,
  createdByUserId: 'u1',
  createdAt: '',
  updatedAt: '',
};

describe('TicketCard', () => {
  it('renders the ticket subject', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('renders the status chip with display label', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('renders estimate with pts suffix', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('3 pts')).toBeInTheDocument();
  });

  it('shows the edit button for all users', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByRole('button', { name: /edit fix login bug/i })).toBeInTheDocument();
  });

  it('shows the delete button for Admin users', () => {
    render(<TicketCard ticket={ticket} isAdmin={true} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByRole('button', { name: /delete fix login bug/i })).toBeInTheDocument();
  });

  it('hides the delete button for non-Admin users', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /delete fix login bug/i })).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = jest.fn();
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={onEdit} onDelete={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /edit fix login bug/i }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<TicketCard ticket={ticket} isAdmin={true} onEdit={jest.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: /delete fix login bug/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('is not draggable by default', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByRole('article')).toHaveAttribute('draggable', 'false');
  });

  it('is draggable when draggable prop is true', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} draggable />);
    expect(screen.getByRole('article')).toHaveAttribute('draggable', 'true');
  });

  it('applies reduced opacity when isDragging is true', () => {
    render(<TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()} isDragging />);
    const card = screen.getByRole('article');
    expect(card).toHaveStyle('opacity: 0.4');
  });

  it('calls onDragStart when dragging begins', () => {
    const onDragStart = jest.fn();
    render(
      <TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()}
        draggable onDragStart={onDragStart} />
    );
    fireEvent.dragStart(screen.getByRole('article'));
    expect(onDragStart).toHaveBeenCalled();
  });

  it('calls onDragEnd when dragging ends', () => {
    const onDragEnd = jest.fn();
    render(
      <TicketCard ticket={ticket} isAdmin={false} onEdit={jest.fn()} onDelete={jest.fn()}
        draggable onDragEnd={onDragEnd} />
    );
    fireEvent.dragEnd(screen.getByRole('article'));
    expect(onDragEnd).toHaveBeenCalled();
  });
});
