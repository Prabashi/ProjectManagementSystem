import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AppSnackbar from './AppSnackbar';
import notificationReducer, { showNotification } from '../app/notificationSlice';

function makeStore(preload?: { open: boolean; message: string; severity: 'error' | 'success' }) {
  const store = configureStore({ reducer: { notification: notificationReducer } });
  if (preload) store.dispatch(showNotification(preload));
  return store;
}

function renderSnackbar(preload?: Parameters<typeof makeStore>[0]) {
  const store = makeStore(preload);
  render(
    <Provider store={store}>
      <AppSnackbar />
    </Provider>,
  );
  return store;
}

describe('AppSnackbar', () => {
  it('is not visible when notification is closed', () => {
    renderSnackbar();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the message when open', () => {
    renderSnackbar({ open: true, message: 'Something went wrong', severity: 'error' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('dispatches hideNotification when the close button is clicked', () => {
    const store = renderSnackbar({ open: true, message: 'Oops', severity: 'error' });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(store.getState().notification.open).toBe(false);
  });
});
