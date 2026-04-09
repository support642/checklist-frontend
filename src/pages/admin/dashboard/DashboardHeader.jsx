/* eslint-disable no-unused-vars */
"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronDown, X } from "lucide-react"
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
        className="w-full flex items-center justify-between rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm bg-white hover:bg-gray-50 text-left"
      >
        <span className={`truncate ${value === "all" ? "text-gray-500" : "text-gray-900"}`}>
          {displayValue}
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 ml-1 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-purple-200 rounded-md shadow-lg z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${placeholder}...`}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
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
  onResetFilters // Add this prop to handle resetting all filters
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
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:items-center mb-4">
      <div className="lg:w-1/2 flex items-center justify-between lg:justify-start lg:gap-8 text-nowrap">
        <h1 className="text-2xl font-bold tracking-tight text-purple-500">Dashboard</h1>
        { isAdmin && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">Total Users</div>
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
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

          {/* Unit Filter - Only show for checklist */}
          {dashboardType === "checklist" && isAdmin && (
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
          {dashboardType === "checklist" && isAdmin && (
            <SearchableDropdown
              value={divisionFilter}
              onChange={(val) => setDivisionFilter(val)}
              options={availableDivisions}
              placeholder="divisions"
              allLabel="All Divisions"
            />
          )}

          {/* Department Filter - Searchable */}
          {dashboardType === "checklist" && isAdmin && (
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
            <select
              value={username || ""}
              disabled={true}
              className="w-full rounded-md border border-gray-300 p-2 bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
            >
              <option value={username || ""}>{username || "Current User"}</option>
            </select>
          )}

          {/* Reset All Button */}
          {isAdmin && (
            <button
              onClick={handleResetAll}
              className="w-full rounded-md border border-purple-200 bg-purple-50 p-2 text-sm font-bold text-purple-600 hover:bg-purple-100 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Desktop View - 3-column grid for admin, single row for users */}
      <div className="hidden md:block lg:w-1/2">
        <div className={isAdmin ? "grid grid-cols-3 lg:grid-cols-3 gap-2" : "flex items-center gap-2 justify-end"}>
          {/* Row 1 */}
          {/* Date Range Filter */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-left bg-white hover:bg-gray-50"
              >
                {startDate && endDate ? `${startDate} to ${endDate}` : "Date Range"}
              </button>

              {showDateRangePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-purple-200 rounded-md shadow-lg z-10 p-4 w-80">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">Select Date Range</h3>
                      {startDate && endDate && (
                        <button
                          onClick={clearDateRange}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          max={endDate || getTodayDate()}
                          className="w-full rounded border border-gray-300 p-2 text-sm"
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
                          className="w-full rounded border border-gray-300 p-2 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={applyDateRange}
                      disabled={!startDate || !endDate}
                      className="w-full bg-purple-500 text-white py-2 px-4 rounded text-sm hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Apply Date Range
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Unit Filter - Only show for checklist */}
          {dashboardType === "checklist" && isAdmin && (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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

          {/* Row 2 */}
          {/* Division Filter - Searchable */}
          {dashboardType === "checklist" && isAdmin && (
            <SearchableDropdown
              value={divisionFilter}
              onChange={(val) => setDivisionFilter(val)}
              options={availableDivisions}
              placeholder="divisions"
              allLabel="All Divisions"
            />
          )}

          {/* Department Filter - Searchable */}
          {dashboardType === "checklist" && isAdmin && (
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
            <select
              value={username || ""}
              disabled={true}
              className="w-full rounded-md border border-gray-300 p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            >
              <option value={username || ""}>{username || "Current User"}</option>
            </select>
          )}

          {/* Reset All Button */}
          {isAdmin && (
            <div className="flex items-center">
              <button
                onClick={handleResetAll}
                className="w-full rounded-md border border-purple-200 bg-purple-50 p-2 text-sm font-bold text-purple-600 hover:bg-purple-100 transition-colors whitespace-nowrap px-4"
              >
                Reset
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