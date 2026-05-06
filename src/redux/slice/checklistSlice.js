import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchChechListDataForHistory,
  fetchChechListDataSortByDate,
  postChecklistAdminDoneAPI,
  updateChecklistData,
  fetchChecklistMetadata,
  bulkDeleteChecklistAPI,
  bulkLeaveChecklistAPI,
  approveActivationChecklistAPI
} from "../api/checkListApi";

// 1. FETCH PENDING CHECKLIST
export const checklistData = createAsyncThunk(
  "fetch/checklist",
  async ({ page = 1, search = '', status = 'all', frequency = 'all', name = 'all', division = 'all', departmentFilter = 'all' } = {}) => {
    const response = await fetchChechListDataSortByDate(page, search, status, frequency, name, division, departmentFilter);
    return { ...response, page, search, status, frequency, name, division, departmentFilter };
  }
);

// 2. FETCH HISTORY CHECKLIST
export const checklistHistoryData = createAsyncThunk(
  "fetch/history",
  async ({ page = 1, search = "", startDate = "", endDate = "", name = 'all', division = 'all', departmentFilter = 'all', approvalStatus = 'all' } = {}) => {
    return await fetchChechListDataForHistory(page, search, startDate, endDate, name, division, departmentFilter, approvalStatus);
  }
);

// 3. UPDATE CHECKLIST (USER SUBMISSION)
export const updateChecklist = createAsyncThunk(
  "update/checklist",
  async (submissionData) => {
    const updated = await updateChecklistData(submissionData);
    return updated;
  }
);

// 4. ADMIN DONE
export const checklistAdminDone = createAsyncThunk(
  "insert/admin_done",
  async (items) => {
    const admin_done = await postChecklistAdminDoneAPI(items);
    return admin_done;
  }
);

// 5. FETCH METADATA
export const checklistMetadata = createAsyncThunk(
  "fetch/metadata",
  async () => {
    return await fetchChecklistMetadata();
  }
);

// 6. BULK DELETE / DAY OFF
export const bulkDeleteChecklist = createAsyncThunk(
  "checklist/bulkDeleteChecklist",
  async ({ ids, role }, { rejectWithValue }) => {
    try {
      const response = await bulkDeleteChecklistAPI(ids, role);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 7. BULK LEAVE
export const bulkLeaveChecklist = createAsyncThunk(
  "checklist/bulkLeaveChecklist",
  async (taskIds) => {
    return await bulkLeaveChecklistAPI(taskIds);
  }
);

// 8. APPROVE ACTIVATION
export const approveActivation = createAsyncThunk(
  "checklist/approveActivation",
  async (taskIds) => {
    return await approveActivationChecklistAPI(taskIds);
  }
);

const checkListSlice = createSlice({
  name: "checklist",
  initialState: {
    checklist: [],
    history: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
    historyTotalCount: 0,
    historyApprovedCount: 0,
    historyPendingCount: 0,
    historyTotalPages: 0,
    uniqueDivisions: [],
    uniqueDepartments: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checklistData.pending, (state) => {
        state.loading = true;
      })
      .addCase(checklistData.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.page === 1) {
          state.checklist = action.payload.data;
        } else {
          state.checklist = [...state.checklist, ...action.payload.data];
        }
        state.currentPage = action.payload.page;
        state.hasMore = state.checklist.length < action.payload.totalCount;
      })
      .addCase(checklistData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Failed fetching checklist";
      })
      .addCase(checklistHistoryData.pending, (state) => {
        state.loading = true;
      })
      .addCase(checklistHistoryData.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.data;
        state.historyTotalCount = parseInt(action.payload.totalCount) || 0;
        state.historyApprovedCount = parseInt(action.payload.approvedCount) || 0;
        state.historyPendingCount = parseInt(action.payload.pendingCount) || 0;
        state.historyTotalPages = parseInt(action.payload.totalPages) || 0;
      })
      .addCase(checklistHistoryData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Failed fetching history";
      })
      .addCase(updateChecklist.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateChecklist.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateChecklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Update failed";
      })
      .addCase(checklistAdminDone.pending, (state) => {
        state.loading = true;
      })
      .addCase(checklistAdminDone.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(checklistAdminDone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Admin update failed";
      })
      .addCase(checklistMetadata.fulfilled, (state, action) => {
        state.uniqueDivisions = action.payload.divisions || [];
        state.uniqueDepartments = action.payload.departments || [];
      })
      .addCase(bulkDeleteChecklist.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkDeleteChecklist.fulfilled, (state, action) => {
        state.loading = false;
        const { ids } = action.meta.arg;
        const role = localStorage.getItem("role")?.toUpperCase();
        const isAdmin = ["SUPER_ADMIN", "ADMIN", "DIV_ADMIN"].includes(role);

        state.checklist = state.checklist.map(task => {
          if (ids.includes(task.task_id)) {
            if (task.status === 'Inactive' || task.status === 'Activation_Pending') {
              return { ...task, status: isAdmin ? null : 'Activation_Pending' };
            }
            return { ...task, status: 'Inactive' };
          }
          return task;
        });
      })
      .addCase(bulkDeleteChecklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Bulk delete failed";
      })
      .addCase(bulkLeaveChecklist.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkLeaveChecklist.fulfilled, (state, action) => {
        state.loading = false;
        const updatedIds = action.meta.arg;
        state.checklist = state.checklist.map(task => {
          if (updatedIds.includes(task.task_id)) {
            return { ...task, status: 'Leave' };
          }
          return task;
        });
      })
      .addCase(bulkLeaveChecklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Bulk leave update failed";
      })
      .addCase(approveActivation.pending, (state) => {
        state.loading = true;
      })
      .addCase(approveActivation.fulfilled, (state, action) => {
        state.loading = false;
        const approvedIds = action.meta.arg;
        state.checklist = state.checklist.map(task => {
          if (approvedIds.includes(task.task_id)) {
            return { ...task, status: null };
          }
          return task;
        });
      })
      .addCase(approveActivation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Approval failed";
      });
  },
});

export default checkListSlice.reducer;
