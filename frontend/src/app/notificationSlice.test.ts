import notificationReducer, {
  showNotification,
  hideNotification,
  selectNotification,
} from './notificationSlice';

describe('notificationSlice', () => {
  const initialState = { open: false, message: '', severity: 'error' as const };

  it('has correct initial state', () => {
    expect(notificationReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('showNotification sets open, message, and severity', () => {
    const state = notificationReducer(
      initialState,
      showNotification({ message: 'Something went wrong', severity: 'error' }),
    );
    expect(state).toEqual({ open: true, message: 'Something went wrong', severity: 'error' });
  });

  it('showNotification works with success severity', () => {
    const state = notificationReducer(
      initialState,
      showNotification({ message: 'Saved!', severity: 'success' }),
    );
    expect(state.severity).toBe('success');
    expect(state.open).toBe(true);
  });

  it('hideNotification sets open to false', () => {
    const openState = { open: true, message: 'Oops', severity: 'error' as const };
    const state = notificationReducer(openState, hideNotification());
    expect(state.open).toBe(false);
    expect(state.message).toBe('Oops');
  });

  it('selectNotification returns the notification state', () => {
    const notification = { open: true, message: 'Hi', severity: 'info' as const };
    expect(selectNotification({ notification })).toBe(notification);
  });
});
