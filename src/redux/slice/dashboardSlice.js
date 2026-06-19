import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  countCompleteTaskApi,
  countOverDueORExtendedTaskApi,
  countPendingOrDelayTaskApi,
  countTotalTaskApi,
  fetchDashboardDataApi,
  countNotDoneTaskApi,
  getDashboardDataCount,
  fetchDashboardSummaryCountsApi
} from "../api/dashboardApi";

// Dashboard data thunk
export const dashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async ({ dashboardType, staffFilter }) => {
    const data = await fetchDashboardDataApi(dashboardType, staffFilter);
    return data;
  }
);

export const totalTaskInTable = createAsyncThunk(
  "dashboard/totalTaskInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await countTotalTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate)
      return response
    } catch (error) {
      console.error("Error fetching total tasks:", error)
      throw error
    }
  }
)

export const notDoneTaskInTable = createAsyncThunk(
  "dashboard/notDoneTaskInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await countNotDoneTaskApi(
        dashboardType,
        staffFilter,
        departmentFilter,
        unitFilter,
        divisionFilter,
        startDate,
        endDate
      );
      return response;
    } catch (error) {
      console.error("Error fetching NOT DONE tasks:", error);
      throw error;
    }
  }
);


// Update completeTaskInTable
export const completeTaskInTable = createAsyncThunk(
  "dashboard/completeTaskInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await countCompleteTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate)
      return response
    } catch (error) {
      console.error("Error fetching complete tasks:", error)
      throw error
    }
  }
)

export const uniqueGivenByData = createAsyncThunk(
  'fetch/uniqueGivenBy',
  async () => {
    try {
      const { data, error } = await supabase
        .from('checklist')
        .select('given_by')
        .not('given_by', 'is', null)
        .order('given_by');

      if (error) throw error;

      // Extract unique values and remove duplicates
      const uniqueGivenBy = [...new Set(data.map(item => item.given_by))].filter(Boolean);
      return uniqueGivenBy;
    } catch (error) {
      console.error("Error fetching unique given_by:", error);
      throw error;
    }
  }
);

// Update pendingTaskInTable
export const pendingTaskInTable = createAsyncThunk(
  "dashboard/pendingTaskInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await countPendingOrDelayTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate)
      return response
    } catch (error) {
      console.error("Error fetching pending tasks:", error)
      throw error
    }
  }
)

// Update overdueTaskInTable
export const overdueTaskInTable = createAsyncThunk(
  "dashboard/overdueTaskInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await countOverDueORExtendedTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate)
      return response
    } catch (error) {
      console.error("Error fetching overdue tasks:", error)
      throw error
    }
  }
)

export const pendingTodayInTable = createAsyncThunk(
  "dashboard/pendingTodayInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await getDashboardDataCount(dashboardType, staffFilter, "recent", departmentFilter, unitFilter, divisionFilter, startDate, endDate)
      return response
    } catch (error) {
      console.error("Error fetching pending today tasks:", error)
      throw error
    }
  }
)

export const pendingUpcomingInTable = createAsyncThunk(
  "dashboard/pendingUpcomingInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await getDashboardDataCount(dashboardType, staffFilter, "upcoming", departmentFilter, unitFilter, divisionFilter, startDate, endDate)
      return response
    } catch (error) {
      console.error("Error fetching pending upcoming tasks:", error)
      throw error
    }
  }
)

export const pendingOverdueInTable = createAsyncThunk(
  "dashboard/pendingOverdueInTable",
  async ({ dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate }) => {
    try {
      const response = await getDashboardDataCount(dashboardType, staffFilter, "overdue", departmentFilter, unitFilter, divisionFilter, startDate, endDate)
      return response
    } catch (error) {
      console.error("Error fetching pending overdue tasks:", error)
      throw error
    }
  }
)

export const fetchDashboardSummaryCounts = createAsyncThunk(
  "dashboard/fetchSummaryCounts",
  async (filterParams) => {
    try {
      const response = await fetchDashboardSummaryCountsApi(filterParams);
      return response;
    } catch (error) {
      console.error("Error fetching dashboard summary counts:", error);
      throw error;
    }
  }
)

const dashboardSlice = createSlice({
  name: 'dashBoard',
  initialState: {
    dashboard: [],
    totalTask: 0,
    completeTask: 0,
    notDoneTask: 0,   // <-- ADD THIS
    pendingTask: 0,
    overdueTask: 0,
    pendingToday: 0,
    pendingUpcoming: 0,
    pendingOverdue: 0,
    completedRatingOne: 0,
    completedRatingTwo: 0,
    completedRatingThreePlus: 0,
    error: null,
    loading: false,
  },
  reducers: {
    resetDashboardState: (state) => {
      state.dashboard = [];
      state.totalTask = 0;
      state.completeTask = 0;
      state.pendingTask = 0;
      state.overdueTask = 0;
      state.pendingToday = 0;
      state.pendingUpcoming = 0;
      state.pendingOverdue = 0;
      state.completedRatingOne = 0;
      state.completedRatingTwo = 0;
      state.completedRatingThreePlus = 0;
      state.error = null;
      state.loading = false;
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Dashboard Data cases
      .addCase(dashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(dashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(dashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch dashboard data';
      })

      // Total Task cases
      .addCase(totalTaskInTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(totalTaskInTable.fulfilled, (state, action) => {
        state.loading = false;
        state.totalTask = action.payload || 0;
      })
      // NOT DONE Task cases
      .addCase(notDoneTaskInTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(notDoneTaskInTable.fulfilled, (state, action) => {
        state.loading = false;
        // state.notDoneTask = action.payload || 0;
        state.notDoneTask = typeof action.payload === "number" ? action.payload : 0;
      })
      .addCase(notDoneTaskInTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Failed to fetch NOT DONE tasks";
      })
      .addCase(totalTaskInTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch total tasks';
      })

      // Complete Task cases
      .addCase(completeTaskInTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeTaskInTable.fulfilled, (state, action) => {
        state.loading = false;
        state.completeTask = action.payload || 0;
      })
      .addCase(completeTaskInTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch complete tasks';
      })

      // Pending Task cases
      .addCase(pendingTaskInTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(pendingTaskInTable.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingTask = action.payload || 0;
      })
      .addCase(pendingTaskInTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch pending tasks';
      })

      // Overdue Task cases
      .addCase(overdueTaskInTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(overdueTaskInTable.fulfilled, (state, action) => {
        state.loading = false;
        state.overdueTask = action.payload || 0;
      })
      .addCase(overdueTaskInTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch overdue tasks';
      })
      // Pending Today cases
      .addCase(pendingTodayInTable.fulfilled, (state, action) => {
        state.pendingToday = action.payload || 0;
      })
      // Pending Upcoming cases
      .addCase(pendingUpcomingInTable.fulfilled, (state, action) => {
        state.pendingUpcoming = action.payload || 0;
      })
      // Pending Overdue cases
      .addCase(pendingOverdueInTable.fulfilled, (state, action) => {
        state.pendingOverdue = action.payload || 0;
      })
      .addCase(fetchDashboardSummaryCounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardSummaryCounts.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload || {};
        state.totalTask = data.totalTasks || 0;
        state.completeTask = data.completedTasks || 0;
        state.pendingTask = data.pendingTasks || 0;
        state.overdueTask = data.overdueTasks || 0;
        state.notDoneTask = data.notDoneTasks || 0;
        state.pendingToday = data.pendingToday || 0;
        state.pendingUpcoming = data.pendingUpcoming || 0;
        state.pendingOverdue = data.pendingOverdue || 0;
        state.completedRatingOne = data.completedRatingOne || 0;
        state.completedRatingTwo = data.completedRatingTwo || 0;
        state.completedRatingThreePlus = data.completedRatingThreePlus || 0;
      })
      .addCase(fetchDashboardSummaryCounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch summary counts';
      });
  },
});

export const { resetDashboardState, clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;