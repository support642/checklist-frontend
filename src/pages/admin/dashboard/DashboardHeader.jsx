/* eslint-disable no-unused-vars */
"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronDown, X, Download } from "lucide-react"
import { getTotalUsersCountApi } from "../../../redux/api/dashboardApi"
import { canAccessModule } from "../../../utils/permissionUtils"

// Reusable Searchable Dropdown Component
function SearchableDropdown({ value, onChange, options, placeholder, allLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const displayValue = value === "all" ? allLabel : value;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-purple-100 p-2.5 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm bg-white hover:bg-slate-50 text-left font-medium text-slate-700 shadow-sm transition-all"
      >
        <span className={`truncate ${value === "all" ? "text-slate-400" : "text-slate-700"}`}>
          {displayValue}
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 ml-1 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${placeholder}...`}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {/* "All" option - always visible */}
            {!search && (
              <button
                onClick={() => handleSelect("all")}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 ${value === "all" ? "bg-purple-100 text-purple-900 font-medium" : "text-gray-700"}`}
              >
                {allLabel}
              </button>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 ${value === opt ? "bg-purple-100 text-purple-900 font-medium" : "text-gray-700"}`}
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-gray-400 text-center italic">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardHeader({
  dashboardType,
  setDashboardType,
  dashboardStaffFilter,
  setDashboardStaffFilter,
  availableStaff,
  userRole,
  username,
  departmentFilter,
  setDepartmentFilter,
  availableDepartments,
  unitFilter,
  setUnitFilter,
  availableUnits,
  divisionFilter,
  setDivisionFilter,
  availableDivisions,
  isLoadingMore,
  startDate: propStartDate = "",
  endDate: propEndDate = "",
  onDateRangeChange, // Add this prop to handle date range selection
  onResetFilters, // Add this prop to handle resetting all filters
  onExportCSV // Add this prop to handle CSV download
}) {
  const [totalUsersCount, setTotalUsersCount] = useState(0)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [startDate, setStartDate] = useState(propStartDate)
  const [endDate, setEndDate] = useState(propEndDate)

  // Sync internal state with props (useful for Reset action)
  useEffect(() => {
    setStartDate(propStartDate);
    setEndDate(propEndDate);
  }, [propStartDate, propEndDate]);

  // Fetch total users count
  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const count = await getTotalUsersCountApi()
        setTotalUsersCount(count)
      } catch (error) {
        console.error('Error fetching total users count:', error)
      }
    }

    fetchTotalUsers()
  }, [])

  // Auto-select unit if there is exactly 1 available
  useEffect(() => {
    if (availableUnits && availableUnits.length === 1) {
      if (unitFilter !== availableUnits[0]) {
        setUnitFilter(availableUnits[0])
      }
    }
  }, [availableUnits, unitFilter, setUnitFilter])

  // Apply date range filter
  const applyDateRange = () => {
    if (startDate && endDate && onDateRangeChange) {
      onDateRangeChange(startDate, endDate)
      setShowDateRangePicker(false)
    }
  }

  // Clear date range filter
  const clearDateRange = () => {
    setStartDate("")
    setEndDate("")
    if (onDateRangeChange) {
      onDateRangeChange(null, null)
    }
    setShowDateRangePicker(false)
  }

  // Handle global reset
  const handleResetAll = () => {
    setStartDate("");
    setEndDate("");
    setShowDateRangePicker(false);
    if (onResetFilters) {
      onResetFilters();
    }
  };

  // Get today's date in YYYY-MM-DD format for max date
  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-CA')
  }

  const isAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "div_admin";

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:items-center mb-6">
      <div className="lg:w-[28%] flex items-center justify-between lg:justify-start lg:gap-6 text-nowrap">
        <h1 className="text-2xl font-bold tracking-tight text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">Dashboard</h1>
        { isAdmin && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Users</div>
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">
                {totalUsersCount}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile & Tablet View - Dropdowns in grid layout */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2">
          {/* Date Range Filter */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-left bg-white"
              >
                {startDate && endDate ? `${startDate} to ${endDate}` : "Date Range"}
              </button>

              {showDateRangePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-purple-200 rounded-md shadow-lg z-10 p-3 w-64">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate || getTodayDate()}
                        className="w-full rounded border border-gray-300 p-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={getTodayDate()}
                        className="w-full rounded border border-gray-300 p-1 text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={applyDateRange}
                        disabled={!startDate || !endDate}
                        className="flex-1 bg-purple-500 text-white py-1 px-2 rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                      <button
                        onClick={clearDateRange}
                        className="flex-1 bg-gray-500 text-white py-1 px-2 rounded text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Unit Filter - Only show for checklist and maintenance */}
          {(dashboardType === "checklist" || dashboardType === "maintenance") && isAdmin && (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
            >
              {(!availableUnits || availableUnits.length !== 1) && (
                <option value="all">All Units</option>
              )}
              {availableUnits && availableUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          )}

          {/* Division Filter - Searchable */}
          {(dashboardType === "checklist" || dashboardType === "maintenance") && isAdmin && (
            <SearchableDropdown
              value={divisionFilter}
              onChange={(val) => setDivisionFilter(val)}
              options={availableDivisions}
              placeholder="divisions"
              allLabel="All Divisions"
            />
          )}

          {/* Department Filter - Searchable */}
          {(dashboardType === "checklist" || dashboardType === "maintenance") && isAdmin && (
            <SearchableDropdown
              value={departmentFilter}
              onChange={(val) => setDepartmentFilter(val)}
              options={availableDepartments}
              placeholder="departments"
              allLabel="All Departments"
            />
          )}

          {/* Dashboard Staff Filter - Searchable */}
          {isAdmin ? (
            <SearchableDropdown
              value={dashboardStaffFilter}
              onChange={(val) => setDashboardStaffFilter(val)}
              options={(userRole !== "super_admin" && dashboardType !== "delegation" && (divisionFilter === "all" || departmentFilter === "all")) ? [] : availableStaff}
              placeholder="staff"
              allLabel="All Staff Members"
            />
          ) : (
            <div className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-100 hover:border-slate-300 transition-all duration-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
              <span className="text-sm font-semibold text-slate-600 truncate">{username || "Current User"}</span>
            </div>
          )}

          {/* Reset All Button */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={handleResetAll}
                className="flex-1 rounded-md border border-purple-200 bg-purple-50 p-2 text-sm font-bold text-purple-600 hover:bg-purple-100 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={onExportCSV}
                className="flex-1 rounded-md border border-purple-200 bg-purple-600 p-2 text-sm font-bold text-white hover:bg-purple-700 transition-all flex items-center justify-center gap-1 shadow-sm"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop View - 3-column grid for admin, single row for users */}
      <div className="hidden md:block lg:w-[72%]">
        <div className={isAdmin ? "grid grid-cols-3 gap-x-3 gap-y-2 items-center" : "flex items-center gap-3 justify-end"}>
          {/* Row 1 */}
          {/* Date Range Filter */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                className="w-full rounded-xl border border-purple-100 p-2.5 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-left bg-white hover:bg-slate-50 shadow-sm transition-all text-sm font-medium text-slate-700"
              >
                {startDate && endDate ? `${startDate} to ${endDate}` : "Select Date Range"}
              </button>

              {showDateRangePicker && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] p-4 w-80">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase font-bold tracking-widest text-slate-400">Date Filter</h3>
                      {startDate && endDate && (
                        <button
                          onClick={clearDateRange}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase uppercase tracking-wider">From</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          max={endDate || getTodayDate()}
                          className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          max={getTodayDate()}
                          className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                    <button
                      onClick={applyDateRange}
                      disabled={!startDate || !endDate}
                      className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Unit Filter - Only show for checklist and maintenance */}
          {(dashboardType === "checklist" || dashboardType === "maintenance") && isAdmin && (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full rounded-xl border border-purple-100 p-2.5 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white text-sm font-medium text-slate-700 shadow-sm"
            >
              {(!availableUnits || availableUnits.length !== 1) && (
                <option value="all">Global Units (All)</option>
              )}
              {availableUnits && availableUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          )}

          {/* Row 2 */}
          {/* Division Filter - Searchable */}
          {(dashboardType === "checklist" || dashboardType === "maintenance") && isAdmin && (
            <SearchableDropdown
              value={divisionFilter}
              onChange={(val) => setDivisionFilter(val)}
              options={availableDivisions}
              placeholder="divisions"
              allLabel="All Divisions"
            />
          )}

          {/* Department Filter - Searchable */}
          {(dashboardType === "checklist" || dashboardType === "maintenance") && isAdmin && (
            <SearchableDropdown
              value={departmentFilter}
              onChange={(val) => setDepartmentFilter(val)}
              options={availableDepartments}
              placeholder="departments"
              allLabel="All Departments"
            />
          )}

          {/* Dashboard Staff Filter - Searchable */}
          {isAdmin ? (
            <SearchableDropdown
              value={dashboardStaffFilter}
              onChange={(val) => setDashboardStaffFilter(val)}
              options={(userRole !== "super_admin" && dashboardType !== "delegation" && (divisionFilter === "all" || departmentFilter === "all")) ? [] : availableStaff}
              placeholder="staff"
              allLabel="All Staff Members"
            />
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-xl shadow-sm hover:bg-slate-100/80 hover:border-purple-100/50 hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 group-hover:bg-purple-500 group-hover:scale-125 transition-all duration-300"></div>
              <span className="text-sm font-semibold text-slate-600 tracking-tight group-hover:text-slate-900 transition-colors duration-300">{username || "My Dashboard"}</span>
            </div>
          )}

          {/* Reset & Export Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetAll}
                className="flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-wider shadow-sm active:scale-95"
              >
                Reset
              </button>
              <button
                onClick={onExportCSV}
                className="flex-1 rounded-xl border border-purple-200 bg-purple-600 p-2.5 text-xs font-bold text-white hover:bg-purple-700 transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-md active:scale-95"
              >
                <Download size={14} />
                Performance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Close date picker when clicking outside */}
      {showDateRangePicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDateRangePicker(false)}
        />
      )}
    </div>
  )
}