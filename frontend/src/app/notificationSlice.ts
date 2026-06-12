import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AlertColor } from '@mui/material';

interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

const initialState: NotificationState = {
  open: false,
  message: '',
  severity: 'error',
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification(state, action: PayloadAction<{ message: string; severity: AlertColor }>) {
      state.open      = true;
      state.message   = action.payload.message;
      state.severity  = action.payload.severity;
    },
    hideNotification(state) {
      state.open = false;
    },
  },
});

export const { showNotification, hideNotification } = notificationSlice.actions;
export const selectNotification = (state: { notification: NotificationState }) => state.notification;
export default notificationSlice.reducer;
