import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import { showNotification } from './notificationSlice';

export const rtkQueryErrorMiddleware: Middleware = (api) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const meta = (action as { meta?: { arg?: { endpointName?: string } } }).meta;
    const payload = action.payload as
      | { status?: number | string; data?: { title?: string }; error?: string }
      | undefined;

    // 404s are handled per-component (e.g. "no dashboard yet") — skip global notification
    if (payload?.status === 404) return next(action);

    // getMe is called on every page load to restore session — a 401 just means "not logged in"
    if (meta?.arg?.endpointName === 'getMe') return next(action);

    const message = payload?.data?.title ?? payload?.error ?? 'An error occurred';
    api.dispatch(showNotification({ message, severity: 'error' }));
  }
  return next(action);
};
