import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
    fetchMaintenanceDataForHistory,
    fetchMaintenanceDataSortByDate,
    postMaintenanceAdminDoneAPI,
    updateMaintenanceData,
    fetchUniqueMaintenanceData,
    deleteUniqueMaintenanceTasksApi,
    updateUniqueMaintenanceTaskApi,
    fetchMachineParts,
    fetchMaintenanceUniqueCountApi,
    bulkDeleteMaintenanceAPI,
    bulkLeaveMaintenanceAPI,
    approveActivationMaintenanceAPI
} from "../api/maintenanceApi";

// 1. FETCH PENDING MAINTENANCE TASKS
export const maintenanceData = createAsyncThunk(
    "fetch/maintenance",
    async ({
        page = 1,
        search = '',
        startDate = "",
        endDate = "",
        status = 'all',
        frequency = 'all',
        name = 'all',
        division = 'all',
        departmentFilter = 'all'
    } = {}) => {
        const response = await fetchMaintenanceDataSortByDate(
            page,
            search,
            startDate,
            endDate,
            status,
            frequency,
            name,
            division,
            departmentFilter
        );
        return { ...response, page, search, startDate, endDate, status, frequency, name, division, departmentFilter };
    }
);

// 2. FETCH HISTORY MAINTENANCE TASKS
export const maintenanceHistoryData = createAsyncThunk(
    "fetch/maintenanceHistory",
    async ({ page = 1, search = "", startDate = "", endDate = "", name = 'all', division = 'all', departmentFilter = 'all', approvalStatus = 'all' } = {}) => {
        return await fetchMaintenanceDataForHistory(page, search, startDate, endDate, name, division, departmentFilter, approvalStatus);
    }
);

// 3. UPDATE MAINTENANCE TASKS (USER SUBMISSION)
export const updateMaintenance = createAsyncThunk(
    "update/maintenance",
    async (submissionData) => {
        const updated = await updateMaintenanceData(submissionData);
        return updated;
    }
);

// 4. ADMIN DONE
export const maintenanceAdminDone = createAsyncThunk(
    "insert/maintenance_admin_done",
    async (items) => {
        const admin_done = await postMaintenanceAdminDoneAPI(items);
        return admin_done;
    }
);

// 5. FETCH UNIQUE MAINTENANCE TASKS (QUICKTASK)
export const uniqueMaintenanceTaskData = createAsyncThunk(
    "fetch/uniqueMaintenanceTask",
    async ({ page = 0, pageSize = 50, nameFilter = "", freqFilter = "", append = false, userRole = "", userDept = "", userDiv = "", userName = "", deptFilter = "", divFilter = "" }) => {
        const result = await fetchUniqueMaintenanceData(page, pageSize, nameFilter, freqFilter, userRole, userDept, userDiv, userName, deptFilter, divFilter);
        return { ...result, append };
    }
);

// 6. DELETE UNIQUE MAINTENANCE TASKS (QUICKTASK)
export const deleteUniqueMaintenanceTask = createAsyncThunk(
    "delete/uniqueMaintenanceTask",
    async (tasks, { rejectWithValue }) => {
        try {
            await deleteUniqueMaintenanceTasksApi(tasks);
            return tasks;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// 7. UPDATE UNIQUE MAINTENANCE TASKS (QUICKTASK)
export const updateUniqueMaintenanceTask = createAsyncThunk(
    "update/uniqueMaintenanceTask",
    async ({ updatedTask, originalTask }, { rejectWithValue }) => {
        try {
            const result = await updateUniqueMaintenanceTaskApi(updatedTask, originalTask);
            return result;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchMaintenanceCounts = createAsyncThunk(
    "fetch/maintenanceCounts",
    async ({ userRole, userDept, userDiv, userName }) => {
        return await fetchMaintenanceUniqueCountApi(userRole, userDept, userDiv, userName);
    }
);

// 8. FETCH MACHINE PARTS
export const fetchMachinePartsData = createAsyncThunk(
    "fetch/machineParts",
    async () => {
        return await fetchMachineParts();
    }
);

// 9. BULK DELETE / DAY OFF
export const bulkDeleteMaintenance = createAsyncThunk(
    "maintenance/bulkDeleteMaintenance",
    async ({ ids, role }, { rejectWithValue }) => {
        try {
            return await bulkDeleteMaintenanceAPI(ids, role);
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// 10. BULK LEAVE
export const bulkLeaveMaintenance = createAsyncThunk(
    "maintenance/bulkLeaveMaintenance",
    async (taskIds) => {
        return await bulkLeaveMaintenanceAPI(taskIds);
    }
);

// 11. APPROVE ACTIVATION
export const approveActivation = createAsyncThunk(
    "maintenance/approveActivation",
    async (taskIds) => {
        return await approveActivationMaintenanceAPI(taskIds);
    }
);

const maintenanceSlice = createSlice({
    name: "maintenance",
    initialState: {
        maintenance: [],
        history: [],
        uniqueMaintenanceTasks: [],
        machineParts: [],
        loading: false,
        error: null,
        hasMore: true,
        currentPage: 1,
        pendingTotalCount: 0,
        historyTotalCount: 0,
        historyApprovedCount: 0,
        historyPendingCount: 0,
        historyTotalPages: 0,
        historyCurrentPage: 1,
        uniqueMaintenancePage: 0,
        uniqueMaintenanceTotal: 0,
        discreteMaintenanceTotal: 0,
        uniqueMaintenanceHasMore: true,
    },
    reducers: {
        resetUniqueMaintenancePagination: (state) => {
            state.uniqueMaintenanceTasks = [];
            state.uniqueMaintenancePage = 0;
            state.uniqueMaintenanceHasMore = true;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(maintenanceData.pending, (state) => {
                state.loading = true;
            })
            .addCase(maintenanceData.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.page === 1) {
                    state.maintenance = action.payload.data;
                } else {
                    state.maintenance = [...state.maintenance, ...action.payload.data];
                }
                state.currentPage = action.payload.page;
                state.pendingTotalCount = parseInt(action.payload.totalCount) || 0;
                state.hasMore = state.maintenance.length < action.payload.totalCount;
            })
            .addCase(maintenanceData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || "Failed fetching maintenance tasks";
            })
            .addCase(maintenanceHistoryData.fulfilled, (state, action) => {
                state.loading = false;
                state.history = action.payload.data;
                state.historyTotalCount = parseInt(action.payload.totalCount) || 0;
                state.historyApprovedCount = parseInt(action.payload.approvedCount) || 0;
                state.historyPendingCount = parseInt(action.payload.pendingCount) || 0;
                state.historyTotalPages = parseInt(action.payload.totalPages) || 0;
                state.historyCurrentPage = parseInt(action.payload.page) || 1;
            })
            .addCase(updateMaintenance.fulfilled, (state, action) => {
                state.loading = false;
                const submittedIds = action.meta.arg.map(item => item.taskId);
                state.maintenance = state.maintenance.filter(task => !submittedIds.includes(task.task_id));
            })
            .addCase(uniqueMaintenanceTaskData.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload?.data || [];
                const total = action.payload?.total || 0;
                const append = action.payload?.append || false;
                if (append) {
                    state.uniqueMaintenanceTasks = [...state.uniqueMaintenanceTasks, ...data];
                    state.uniqueMaintenancePage += 1;
                } else {
                    state.uniqueMaintenanceTasks = data;
                    state.uniqueMaintenancePage = 1;
                }
                state.uniqueMaintenanceTotal = total;
                state.uniqueMaintenanceHasMore = state.uniqueMaintenanceTasks.length < total;
            })
            .addCase(bulkDeleteMaintenance.pending, (state) => {
                state.loading = true;
            })
            .addCase(bulkDeleteMaintenance.fulfilled, (state, action) => {
                state.loading = false;
                const { ids } = action.meta.arg;
                const role = localStorage.getItem("role")?.toUpperCase();
                const isAdmin = ["SUPER_ADMIN", "ADMIN", "DIV_ADMIN"].includes(role);

                state.maintenance = state.maintenance.map(task => {
                    if (ids.includes(task.task_id)) {
                        if (task.status === 'Inactive' || task.status === 'Activation_Pending') {
                            return { ...task, status: isAdmin ? 'Pending' : 'Activation_Pending' };
                        }
                        return { ...task, status: 'Inactive' };
                    }
                    return task;
                });
            })
            .addCase(bulkDeleteMaintenance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || "Bulk delete failed";
            })
            .addCase(bulkLeaveMaintenance.fulfilled, (state, action) => {
                state.loading = false;
                const updatedIds = action.meta.arg;
                state.maintenance = state.maintenance.map(task => {
                    if (updatedIds.includes(task.task_id)) {
                        return { ...task, status: 'Leave' };
                    }
                    return task;
                });
            })
            .addCase(approveActivation.pending, (state) => {
                state.loading = true;
            })
            .addCase(approveActivation.fulfilled, (state, action) => {
                state.loading = false;
                const approvedIds = action.meta.arg;
                state.maintenance = state.maintenance.map(task => {
                    if (approvedIds.includes(task.task_id)) {
                        return { ...task, status: 'Pending' };
                    }
                    return task;
                });
            })
            .addCase(approveActivation.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || "Approval failed";
            })
            .addCase(fetchMachinePartsData.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchMachinePartsData.fulfilled, (state, action) => {
                state.loading = false;
                state.machineParts = action.payload || [];
            })
            .addCase(fetchMachinePartsData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || "Failed fetching machine parts";
            });
    },
});

export const { resetUniqueMaintenancePagination } = maintenanceSlice.actions;
export default maintenanceSlice.reducer;
