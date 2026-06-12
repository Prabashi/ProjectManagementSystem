import { rtkQueryErrorMiddleware } from './rtkQueryErrorMiddleware';
import { showNotification } from './notificationSlice';

// RTK's isRejectedWithValue checks: isPlainObject(meta), requestId in meta, requestStatus === 'rejected', rejectedWithValue === true
function makeRejectedAction(payload: unknown, endpointName?: string) {
  return {
    type:    'api/query/rejected',
    payload,
    meta:    { requestId: 'req-1', requestStatus: 'rejected', rejectedWithValue: true, arg: { endpointName } },
    error:   { message: 'Rejected' },
  };
}

describe('rtkQueryErrorMiddleware', () => {
  const mockDispatch = jest.fn();
  const mockNext     = jest.fn((action) => action);
  const invoke       = (action: unknown) =>
    rtkQueryErrorMiddleware({ dispatch: mockDispatch } as never)(mockNext)(action);

  beforeEach(() => jest.clearAllMocks());

  it('shows snackbar for a rejected action with a title', () => {
    invoke(makeRejectedAction({ status: 400, data: { title: 'Validation failed' } }));
    expect(mockDispatch).toHaveBeenCalledWith(
      showNotification({ message: 'Validation failed', severity: 'error' }),
    );
  });

  it('falls back to payload.error when data.title is absent', () => {
    invoke(makeRejectedAction({ status: 'FETCH_ERROR', error: 'Network error' }));
    expect(mockDispatch).toHaveBeenCalledWith(
      showNotification({ message: 'Network error', severity: 'error' }),
    );
  });

  it('falls back to "An error occurred" when no message is available', () => {
    invoke(makeRejectedAction({ status: 500 }));
    expect(mockDispatch).toHaveBeenCalledWith(
      showNotification({ message: 'An error occurred', severity: 'error' }),
    );
  });

  it('skips 404 errors — components handle "not found" state themselves', () => {
    invoke(makeRejectedAction({ status: 404, data: { title: 'Not Found' } }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('skips getMe errors — a 401 on page load just means the user is not logged in', () => {
    invoke(makeRejectedAction({ status: 401 }, 'getMe'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('always calls next(action)', () => {
    const action = makeRejectedAction({ status: 400 });
    invoke(action);
    expect(mockNext).toHaveBeenCalledWith(action);
  });

  it('passes through non-rejected actions without dispatching', () => {
    invoke({ type: 'some/action' });
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
