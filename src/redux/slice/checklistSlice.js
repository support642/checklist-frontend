import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchChechListDataForHistory,
  fetchChechListDataSortByDate,
  postChecklistAdminDoneAPI,
  updateChecklistData,
  fetchChecklistMetadata,
  bulkDeleteChecklistAPI,
  bulkLeaveChecklistAPI
} from "../api/checkListApi";


// ============================================================
// 1️⃣ FETCH PENDING CHECKLIST
// ============================================================
export const checklistData = createAsyncThunk(
  "fetch/checklist",
  async ({ page = 1, search = '', status = 'all', frequency = 'all', name = 'all', division = 'all', departmentFilter = 'all' } = {}) => {
    const response = await fetchChechListDataSortByDate(page, search, status, frequency, name, division, departmentFilter);
    return { ...response, page, search, status, frequency, name, division, departmentFilter };
  }
);


// ============================================================
// 2️⃣ FETCH HISTORY CHECKLIST
// ============================================================
export const checklistHistoryData = createAsyncThunk(
  "fetch/history",
  async ({ page = 1, search = "", startDate = "", endDate = "", name = 'all', division = 'all', departmentFilter = 'all', approvalStatus = 'all' } = {}) => {
    return await fetchChechListDataForHistory(page, search, startDate, endDate, name, division, departmentFilter, approvalStatus);
  }
);


// ============================================================
// 3️⃣ UPDATE CHECKLIST (USER SUBMISSION)
// ============================================================
export const updateChecklist = createAsyncThunk(
  "update/checklist",
  async (submissionData) => {
    const updated = await updateChecklistData(submissionData);
    return updated;  // returns only message
  }
);


// ============================================================
// 4️⃣ ADMIN DONE
// ============================================================
export const checklistAdminDone = createAsyncThunk(
  "insert/admin_done",
  async (items) => {
    const admin_done = await postChecklistAdminDoneAPI(items);
    return admin_done;
  }
);


// ============================================================
// 5️⃣ FETCH METADATA (DIVISIONS & DEPARTMENTS)
// ============================================================
export const checklistMetadata = createAsyncThunk(
  "fetch/metadata",
  async () => {
    return await fetchChecklistMetadata();
  }
);

export const bulkDeleteChecklist = createAsyncThunk(
  "delete/bulkChecklist",
  async (taskIds) => {
    return await bulkDeleteChecklistAPI(taskIds);
  }
);

export const bulkLeaveChecklist = createAsyncThunk(
  "leave/bulkChecklist",
  async (taskIds) => {
    return await bulkLeaveChecklistAPI(taskIds);
  }
);


// ============================================================
// 6️⃣ SLICE
// ============================================================
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

      // -----------------------------
      // FETCH PENDING CHECKLIST
      // -----------------------------
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

        // Determine pagination
        state.hasMore = state.checklist.length < action.payload.totalCount;
      })

      .addCase(checklistData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Failed fetching checklist";
      })



      // -----------------------------
      // FETCH HISTORY
      // -----------------------------
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



      // -----------------------------
      // UPDATE CHECKLIST (USER SUBMIT)
      // -----------------------------
      .addCase(updateChecklist.pending, (state) => {
        state.loading = true;
      })

      .addCase(updateChecklist.fulfilled, (state) => {
        state.loading = false;
        // No need to update state.checklist – backend already saved
      })

      .addCase(updateChecklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Failed updating checklist";
      })



      // -----------------------------
      // ADMIN DONE
      // -----------------------------
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

      // -----------------------------
      // FETCH METADATA
      // -----------------------------
      .addCase(checklistMetadata.fulfilled, (state, action) => {
        state.uniqueDivisions = action.payload.divisions || [];
        state.uniqueDepartments = action.payload.departments || [];
      })
      
      // -----------------------------
      // BULK DELETE
      // -----------------------------
      .addCase(bulkDeleteChecklist.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkDeleteChecklist.fulfilled, (state, action) => {
        state.loading = false;
        const taskIds = action.meta.arg;
        state.checklist = state.checklist.map(task => {
          if (taskIds.includes(task.task_id)) {
            return { ...task, status: task.status === 'Inactive' ? null : 'Inactive' };
          }
          return task;
        });
      })
      .addCase(bulkDeleteChecklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Bulk delete failed";
      })

      // -----------------------------
      // BULK LEAVE
      // -----------------------------
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
      });
  },
});

export default checkListSlice.reducer;
