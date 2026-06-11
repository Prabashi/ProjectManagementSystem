import { renderHook, act } from '@testing-library/react';
import { useProjectHub } from './useProjectHub';
import { useAppDispatch } from '../app/hooks';
import { api } from '../services/api';

const mockConnection = {
  on:     jest.fn(),
  start:  jest.fn().mockResolvedValue(undefined),
  invoke: jest.fn().mockResolvedValue(undefined),
  stop:   jest.fn().mockResolvedValue(undefined),
};

jest.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: jest.fn().mockImplementation(() => ({
    withUrl:               jest.fn().mockReturnThis(),
    withAutomaticReconnect: jest.fn().mockReturnThis(),
    build:                  jest.fn().mockReturnValue(mockConnection),
  })),
}));

jest.mock('../app/hooks', () => ({ useAppDispatch: jest.fn() }));
jest.mock('../services/api', () => ({
  api: {
    util: {
      updateQueryData: jest.fn(),
      invalidateTags:  jest.fn(),
    },
  },
}));

describe('useProjectHub', () => {
  let mockDispatch: jest.Mock;
  let handlers: Record<string, (data: unknown) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    handlers = {};
    mockConnection.on.mockImplementation((event: string, handler: (data: unknown) => void) => {
      handlers[event] = handler;
    });
  });

  it('starts connection and joins project on mount', async () => {
    renderHook(() => useProjectHub('p1'));
    await act(async () => {});
    expect(mockConnection.start).toHaveBeenCalled();
    expect(mockConnection.invoke).toHaveBeenCalledWith('JoinProject', 'p1');
  });

  it('registers all four event handlers', () => {
    renderHook(() => useProjectHub('p1'));
    expect(mockConnection.on).toHaveBeenCalledWith('TicketCreated', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('TicketUpdated', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('TicketDeleted', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('SprintChanged', expect.any(Function));
  });

  it('leaves project and stops connection on unmount', async () => {
    const { unmount } = renderHook(() => useProjectHub('p1'));
    await act(async () => {});
    unmount();
    expect(mockConnection.invoke).toHaveBeenCalledWith('LeaveProject', 'p1');
    expect(mockConnection.stop).toHaveBeenCalled();
  });

  it('TicketCreated handler dispatches updateQueryData for the project', () => {
    renderHook(() => useProjectHub('p1'));
    act(() => handlers['TicketCreated']({ ticket: { id: 't1', status: 'ToDo' } }));
    expect(api.util.updateQueryData).toHaveBeenCalledWith('getDashboard', 'p1', expect.any(Function));
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('TicketUpdated handler dispatches updateQueryData for the project', () => {
    renderHook(() => useProjectHub('p1'));
    act(() => handlers['TicketUpdated']({ ticket: { id: 't1', status: 'Done' } }));
    expect(api.util.updateQueryData).toHaveBeenCalledWith('getDashboard', 'p1', expect.any(Function));
  });

  it('TicketDeleted handler dispatches updateQueryData for the project', () => {
    renderHook(() => useProjectHub('p1'));
    act(() => handlers['TicketDeleted']({ ticketId: 't1' }));
    expect(api.util.updateQueryData).toHaveBeenCalledWith('getDashboard', 'p1', expect.any(Function));
  });

  it('SprintChanged handler dispatches invalidateTags for Dashboard', () => {
    renderHook(() => useProjectHub('p1'));
    act(() => handlers['SprintChanged']({}));
    expect(api.util.invalidateTags).toHaveBeenCalledWith([{ type: 'Dashboard', id: 'p1' }]);
    expect(mockDispatch).toHaveBeenCalled();
  });
});
