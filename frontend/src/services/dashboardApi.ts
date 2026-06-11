import { api } from './api';
import type { Dashboard } from '../types';

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<Dashboard, string>({
      query: (projectId) => `projects/${projectId}/dashboard`,
      providesTags: (_result, _error, projectId) => [
        { type: 'Dashboard', id: projectId },
        { type: 'Ticket',    id: projectId },
      ],
    }),
    createDashboard: builder.mutation<Dashboard, { projectId: string; name: string }>({
      query: ({ projectId, ...body }) => ({
        url:    `projects/${projectId}/dashboard`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Dashboard', id: projectId }],
    }),
  }),
});

export const { useGetDashboardQuery, useCreateDashboardMutation } = dashboardApi;
