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
            query: ({ search, page = 1, limit = 10 }) => ({
                url: '/working-date-history/list',
                method: 'GET',
                params: { search, page, limit }
            }),
            // Use search term as part of the cache key to keep results separate per search
            serializeQueryArgs: ({ endpointName, queryArgs }) => {
                return `${endpointName}-${queryArgs.search || ''}`;
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
            // Refetch when the page or search changes
            forceRefetch({ currentArg, previousArg }) {
                return currentArg?.page !== previousArg?.page || currentArg?.search !== previousArg?.search;
            },
            providesTags: [{ type: 'WorkingHistory', id: 'LIST' }],
        }),

        // Get specific employee history (Super Admin use)
        getEmployeeHistoryDetail: builder.query({
            query: (username) => ({ url: `/working-date-history/detail/${username}`, method: 'GET' }),
            providesTags: (result, error, username) => [{ type: 'WorkingHistory', id: username }],
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
    }),
});

export const {
    useGetWorkingHistoryQuery,
    useGetEmployeeHistoryDetailQuery,
    useSubmitWorkingDateMutation
} = workingDateHistoryApi;
