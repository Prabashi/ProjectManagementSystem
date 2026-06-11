import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop } from './useDragAndDrop';
import { useAppDispatch } from '../app/hooks';
import { useMoveTicketMutation } from '../services/ticketsApi';
import { api } from '../services/api';

jest.mock('../app/hooks', () => ({ useAppDispatch: jest.fn() }));
jest.mock('../services/ticketsApi', () => ({ useMoveTicketMutation: jest.fn() }));
jest.mock('../services/api', () => ({
  api: { util: { updateQueryData: jest.fn(() => ({ type: 'mock/patch', undo: jest.fn() })) } },
}));

const mockEvent = { preventDefault: jest.fn() } as unknown as React.DragEvent;

describe('useDragAndDrop', () => {
  let mockDispatch: jest.Mock;
  let mockMoveTicket: jest.Mock;
  let mockUndo: jest.Mock;

  beforeEach(() => {
    mockUndo = jest.fn();
    mockDispatch = jest.fn().mockReturnValue({ type: 'mock/patch', undo: mockUndo });
    mockMoveTicket = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useMoveTicketMutation as jest.Mock).mockReturnValue([mockMoveTicket]);
    (api.util.updateQueryData as jest.Mock).mockReturnValue({ type: 'mock/patch', undo: mockUndo });
  });

  it('starts with draggingId as null', () => {
    const { result } = renderHook(() => useDragAndDrop('p1'));
    expect(result.current.draggingId).toBeNull();
  });

  it('onDragStart sets draggingId to the ticket id', () => {
    const { result } = renderHook(() => useDragAndDrop('p1'));
    act(() => result.current.onDragStart('t1'));
    expect(result.current.draggingId).toBe('t1');
  });

  it('onDragEnd clears draggingId', () => {
    const { result } = renderHook(() => useDragAndDrop('p1'));
    act(() => result.current.onDragStart('t1'));
    act(() => result.current.onDragEnd());
    expect(result.current.draggingId).toBeNull();
  });

  it('onDrop clears draggingId and calls moveTicket with correct args', async () => {
    const { result } = renderHook(() => useDragAndDrop('p1'));
    act(() => result.current.onDragStart('t1'));

    await act(async () => {
      await result.current.onDrop(mockEvent, 'InProgress');
    });

    expect(result.current.draggingId).toBeNull();
    expect(mockMoveTicket).toHaveBeenCalledWith({ projectId: 'p1', ticketId: 't1', status: 'InProgress' });
  });

  it('onDrop does nothing when no ticket is being dragged', async () => {
    const { result } = renderHook(() => useDragAndDrop('p1'));

    await act(async () => {
      await result.current.onDrop(mockEvent, 'InProgress');
    });

    expect(mockMoveTicket).not.toHaveBeenCalled();
  });

  it('onDrop applies optimistic update before calling moveTicket', async () => {
    const { result } = renderHook(() => useDragAndDrop('p1'));
    act(() => result.current.onDragStart('t1'));

    await act(async () => {
      await result.current.onDrop(mockEvent, 'Done');
    });

    expect(mockDispatch).toHaveBeenCalled();
    expect(mockMoveTicket).toHaveBeenCalled();
  });

  it('onDrop rolls back optimistic update when moveTicket fails', async () => {
    mockMoveTicket.mockReturnValue({ unwrap: () => Promise.reject(new Error('Network error')) });

    const { result } = renderHook(() => useDragAndDrop('p1'));
    act(() => result.current.onDragStart('t1'));

    await act(async () => {
      await result.current.onDrop(mockEvent, 'Done');
    });

    expect(mockUndo).toHaveBeenCalled();
  });
});
