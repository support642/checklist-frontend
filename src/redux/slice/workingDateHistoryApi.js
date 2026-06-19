import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosClient } from '../../api/axiosClient';

// A custom baseQuery function wrapping our pre-configured axios client
const axiosBaseQuery =
    ({ baseUrl } = { baseUrl: '' }) =>
        async ({ url, method, data, params, headers }) => {
            try {
                const result = await axiosClient({
                    url: baseUrl + url,
                    method,
                    data,
                    params,
                    headers,
                });
                return { data: result.data };
            } catch (axiosError) {
                const err = axiosError;
                return {
                    error: {
                        status: err.response?.status,
                        data: err.response?.data || err.message,
                    },
                };
            }
        };

export const workingDateHistoryApi = createApi({
    reducerPath: 'workingDateHistoryApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['WorkingHistory'],
    endpoints: (builder) => ({
        // Get role-based history list with pagination
        getWorkingHistory: builder.query({
            query: ({ search, page = 1, limit = 10, startDate, endDate, filterUser }) => ({
                url: '/working-date-history/list',
                method: 'GET',
                params: { search, page, limit, startDate, endDate, filterUser }
            }),
            // Use search term and filters as part of the cache key to keep results separate
            serializeQueryArgs: ({ endpointName, queryArgs }) => {
                return `${endpointName}-${queryArgs.search || ''}-${queryArgs.startDate || ''}-${queryArgs.endDate || ''}-${queryArgs.filterUser || ''}`;
            },
            // Merge incoming paginated data into the existing cache
            merge: (currentCache, newItems) => {
                if (newItems.page === 1) {
                    return newItems;
                }
                return {
                    ...newItems,
                    data: [...currentCache.data, ...newItems.data]
                };
            },
            // Refetch when the page or any filter changes
            forceRefetch({ currentArg, previousArg }) {
                return currentArg?.page !== previousArg?.page || 
                       currentArg?.search !== previousArg?.search ||
                       currentArg?.startDate !== previousArg?.startDate ||
                       currentArg?.endDate !== previousArg?.endDate ||
                       currentArg?.filterUser !== previousArg?.filterUser;
            },
            providesTags: [{ type: 'WorkingHistory', id: 'LIST' }],
        }),

        // Get specific employee history (Super Admin use)
        getEmployeeHistoryDetail: builder.query({
            query: ({ targetUsername, page = 1, limit = 10 }) => ({ 
                url: `/working-date-history/detail/${targetUsername}`, 
                method: 'GET',
                params: { page, limit }
            }),
            serializeQueryArgs: ({ endpointName, queryArgs }) => {
                return `${endpointName}-${queryArgs.targetUsername}`;
            },
            merge: (currentCache, newItems) => {
                if (newItems.page === 1) {
                    return newItems;
                }
                return {
                    ...newItems,
                    data: [...currentCache.data, ...newItems.data]
                };
            },
            forceRefetch({ currentArg, previousArg }) {
                return currentArg?.page !== previousArg?.page || currentArg?.targetUsername !== previousArg?.targetUsername;
            },
            providesTags: (result, error, { targetUsername }) => [{ type: 'WorkingHistory', id: targetUsername }],
        }),

        // Submit new work history
        submitWorkingDate: builder.mutation({
            query: (payload) => ({
                url: '/working-date-history/submit',
                method: 'POST',
                data: payload,
            }),
            invalidatesTags: [{ type: 'WorkingHistory', id: 'LIST' }],
        }),

        // Update work history
        updateWorkingDate: builder.mutation({
            query: ({ id, payload }) => ({
                url: `/working-date-history/update/${id}`,
                method: 'PUT',
                data: payload,
            }),
            invalidatesTags: (result, error, { payload }) => [
                { type: 'WorkingHistory', id: 'LIST' },
                { type: 'WorkingHistory', id: payload?.userName }
            ],
        }),

        // Delete work history
        deleteWorkingDate: builder.mutation({
            query: (id) => ({
                url: `/working-date-history/delete/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'WorkingHistory', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetWorkingHistoryQuery,
    useGetEmployeeHistoryDetailQuery,
    useSubmitWorkingDateMutation,
    useUpdateWorkingDateMutation,
    useDeleteWorkingDateMutation
} = workingDateHistoryApi;
