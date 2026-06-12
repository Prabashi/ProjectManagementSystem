import { renderHook } from '@testing-library/react';
import { useNotification } from './useNotification';
import { useAppDispatch } from '../app/hooks';
import { showNotification } from '../app/notificationSlice';

jest.mock('../app/hooks', () => ({ useAppDispatch: jest.fn() }));

describe('useNotification', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  it('showError dispatches showNotification with severity error', () => {
    const { result } = renderHook(() => useNotification());
    result.current.showError('Something broke');
    expect(mockDispatch).toHaveBeenCalledWith(
      showNotification({ message: 'Something broke', severity: 'error' }),
    );
  });

  it('showSuccess dispatches showNotification with severity success', () => {
    const { result } = renderHook(() => useNotification());
    result.current.showSuccess('Saved!');
    expect(mockDispatch).toHaveBeenCalledWith(
      showNotification({ message: 'Saved!', severity: 'success' }),
    );
  });

  it('returns stable function references across renders', () => {
    const { result, rerender } = renderHook(() => useNotification());
    const first = result.current.showError;
    rerender();
    expect(result.current.showError).toBe(first);
  });
});
