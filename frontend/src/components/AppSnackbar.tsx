import { Alert, Snackbar } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { hideNotification, selectNotification } from '../app/notificationSlice';

export default function AppSnackbar() {
  const dispatch = useAppDispatch();
  const { open, message, severity } = useAppSelector(selectNotification);

  const handleClose = () => dispatch(hideNotification());

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity={severity} onClose={handleClose} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
