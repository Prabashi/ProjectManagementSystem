import { useCallback } from 'react';
import { useAppDispatch } from '../app/hooks';
import { showNotification } from '../app/notificationSlice';

export function useNotification() {
  const dispatch = useAppDispatch();

  const showError = useCallback(
    (message: string) => dispatch(showNotification({ message, severity: 'error' })),
    [dispatch],
  );

  const showSuccess = useCallback(
    (message: string) => dispatch(showNotification({ message, severity: 'success' })),
    [dispatch],
  );

  return { showError, showSuccess };
}
