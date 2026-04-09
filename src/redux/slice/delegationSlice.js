import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchDelegationDataSortByDate,
  fetchDelegation_DoneDataSortByDate,
  insertDelegationDoneAndUpdate,
} from "../api/delegationApi";

export const delegationData = createAsyncThunk(
  "delegation/fetchPending",
  async ({ startDate = "", endDate = "" } = {}) => {
    return await fetchDelegationDataSortByDate(startDate, endDate);
  }
);

export const delegationDoneData = createAsyncThunk(
  "delegation/fetchDone",
  async ({ page = 1, search = "", startDate = "", endDate = "", name = 'all', division = 'all', departmentFilter = 'all', approvalStatus = 'all' } = {}) => {
    return await fetchDelegation_DoneDataSortByDate(page, search, startDate, endDate, name, division, departmentFilter, approvalStatus);
  }
);

export const submitDelegation = createAsyncThunk(
  "delegation/submit",
  async (payload) => {
    return await insertDelegationDoneAndUpdate(payload);
  }
);

const delegationSlice = createSlice({
  name: "delegation",
  initialState: {
    delegation: [],
    delegation_done: [],
    delegationTotalCount: 0,
    delegationApprovedCount: 0,
    delegationPendingCount: 0,
    delegationTotalPages: 0,
    delegationCurrentPage: 1,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Pending
      .addCase(delegationData.pending, (state) => {
        state.loading = true;
      })
      .addCase(delegationData.fulfilled, (state, action) => {
        state.loading = false;
        state.delegation = action.payload;
      })
      .addCase(delegationData.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to fetch delegation";
      })

      // Fetch Done
      .addCase(delegationDoneData.pending, (state) => {
        state.loading = true;
      })
      .addCase(delegationDoneData.fulfilled, (state, action) => {
        state.loading = false;
        state.delegation_done = action.payload.data;
        state.delegationTotalCount = parseInt(action.payload.totalCount) || 0;
        state.delegationApprovedCount = parseInt(action.payload.approvedCount) || 0;
        state.delegationPendingCount = parseInt(action.payload.pendingCount) || 0;
        state.delegationTotalPages = parseInt(action.payload.totalPages) || 0;
        state.delegationCurrentPage = parseInt(action.payload.page) || 1;
      })
      .addCase(delegationDoneData.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to fetch done delegation";
      })

      // Submit
      .addCase(submitDelegation.pending, (state) => {
        state.loading = true;
      })
      .addCase(submitDelegation.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(submitDelegation.rejected, (state) => {
        state.loading = false;
        state.error = "Submission failed";
      });
  },
});

export default delegationSlice.reducer;
