import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5231/api',
    // Auth is carried by an HttpOnly cookie — the browser attaches it automatically.
    // credentials: 'include' is required for cross-origin requests (dev: different ports).
    credentials: 'include',
  }),
  tagTypes: ['Project', 'ProjectMember', 'Sprint'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
