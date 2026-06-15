import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegisterMutation } from '../../services/authApi';
import { useAppDispatch } from '../../app/hooks';
import { setUser } from './authSlice';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['User', 'Admin']),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', role: 'User' },
    reValidateMode: 'onChange',
  });
  const [registerUser, { isLoading }] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onSubmit = async (data: FormValues) => {
    try {
      const user = await registerUser({ username: data.username, password: data.password, role: data.role }).unwrap();
      dispatch(setUser(user));
      navigate('/');
    } catch { /* error handled globally via rtkQueryErrorMiddleware */ }
  };

  const busy = isLoading || isSubmitting;

  return (
    <Container maxWidth="xs" sx={{ mt: 12 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Create account</Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Username"
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl required>
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select {...field} labelId="role-label" label="Role">
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Button type="submit" variant="contained" disabled={busy} aria-label="create account">
              {busy ? <CircularProgress size={24} /> : 'Create account'}
            </Button>
          </Stack>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login">Sign in</Link>
        </Typography>
      </Paper>
    </Container>
  );
}
