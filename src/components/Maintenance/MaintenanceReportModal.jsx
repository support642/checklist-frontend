import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, X, Calendar, Filter } from 'lucide-react';

const MaintenanceReportModal = ({
  isOpen,
  onClose,
  onExportPDF,
  onExportCSV,
  isLoading,
  activeFilters = {}
}) => {
  const getDefaultDateRange = () => {
    if (activeFilters.startDate || activeFilters.endDate) {
      return {
        from: activeFilters.startDate || "",
        to: activeFilters.endDate || ""
      };
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${day}`
    };
  };

  const [reportRange, setReportRange] = useState(getDefaultDateRange);

  useEffect(() => {
    if (isOpen) {
      setReportRange(getDefaultDateRange());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePdfSubmit = () => {
    onExportPDF(reportRange);
    onClose();
  };

  const handleCsvSubmit = () => {
    onExportCSV(reportRange);
    onClose();
  };

  const handleCurrentFiltersPdfSubmit = () => {
    onExportPDF(getDefaultDateRange());
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-pink-50 to-white">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-purple-200">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Generate Work Done Report</h3>
              <p className="text-xs text-purple-600 font-medium">Maintenance Tasks Summary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all text-gray-400 active:scale-95 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Select date range for calculating maintenance work done report.</p>

          {/* Active Filters Summary if present */}
          {(activeFilters.division || activeFilters.department || activeFilters.machine || activeFilters.staff) && (
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-purple-700">
                <Filter size={13} />
                <span>Active Dashboard Scope:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeFilters.division && activeFilters.division !== 'all' && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-medium">Division: {activeFilters.division}</span>
                )}
                {activeFilters.department && activeFilters.department !== 'all' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">Dept: {activeFilters.department}</span>
                )}
                {activeFilters.machine && activeFilters.machine !== 'all' && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-medium">Machine: {activeFilters.machine}</span>
                )}
                {activeFilters.staff && activeFilters.staff !== 'all' && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-medium">Staff: {activeFilters.staff}</span>
                )}
              </div>
            </div>
          )}

          {/* Date Picker Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reportFrom" className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <Calendar size={12} />
                From
              </label>
              <input
                type="date"
                id="reportFrom"
                value={reportRange.from}
                onChange={(e) => setReportRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reportTo" className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <Calendar size={12} />
                To
              </label>
              <input
                type="date"
                id="reportTo"
                value={reportRange.to}
                onChange={(e) => setReportRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Download Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={handlePdfSubmit}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FileText size={18} />
              Download PDF Report
            </button>
            <button
              onClick={handleCsvSubmit}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download size={18} />
              Download CSV Report
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              onClick={handleCurrentFiltersPdfSubmit}
              className="text-xs text-gray-500 hover:text-purple-600 font-medium transition-colors cursor-pointer"
            >
              Or download using current dashboard filters
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MaintenanceReportModal;
