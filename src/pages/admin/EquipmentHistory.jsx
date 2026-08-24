import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Download,
  Plus,
  Search,
  FileText,
  RefreshCw,
  Edit2,
  SlidersHorizontal,
  Building2,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { fetchEquipmentHistoryApi } from '../../redux/api/equipmentApi';
import EquipmentMasterModal from '../../components/modals/EquipmentMasterModal';
import AddProductModal from '../../components/asset-components/AddProductModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function EquipmentHistory() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isAssetProfileOpen, setIsAssetProfileOpen] = useState(false);
  const [assetProfileData, setAssetProfileData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEquipmentHistoryApi(
        departmentFilter,
        divisionFilter,
        statusFilter,
        "",
        "",
        searchQuery
      );

      if (res && res.success && Array.isArray(res.data)) {
        setHistoryList(res.data);
      } else {
        setHistoryList([]);
      }
    } catch (error) {
      console.error("Error loading equipment history:", error);
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, divisionFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Export CSV (Matching exact Equipment_History_Register.csv structure)
  const handleExportCSV = () => {
    if (!historyList.length) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "S. No.",
      "Equipment ID",
      "Equipment Name",
      "Make/Model",
      "Serial No.",
      "Department",
      "Purchase Date",
      "Installation Date",
      "Running Hours",
      "Service Date",
      "Breakdown Date",
      "Repair Details",
      "Parts Replaced",
      "Next Service Due",
      "Status",
      "Remarks"
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/"/g, "\"\"")}"`;
      }
      return `"${str}"`;
    };

    const rows = historyList.map((item, index) => [
      index + 1,
      escapeCSV(item.equipment_id),
      escapeCSV(item.equipment_name),
      escapeCSV(item.model),
      escapeCSV(item.serial_no),
      escapeCSV(item.department),
      escapeCSV(item.purchase_date),
      escapeCSV(item.installation_date),
      item.running_hours || 0,
      escapeCSV(item.service_date),
      escapeCSV(item.breakdown_date),
      escapeCSV(item.repair_details),
      escapeCSV(item.parts_replaced),
      escapeCSV(item.next_service_due),
      escapeCSV(item.status),
      escapeCSV(item.remarks)
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filenameDate = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
    link.setAttribute("download", `Equipment_History_Register_${filenameDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Export PDF
  const handleExportPDF = () => {
    if (!historyList.length) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4 (297mm x 210mm)

    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text("EQUIPMENT HISTORY REGISTER REPORT", 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`, 14, 21);

    const tableHeaders = [
      ["S.No", "Equipment ID", "Equipment Name", "Make/Model", "Serial No.", "Dept", "Purch. Date", "Install. Date", "Run Hrs", "Service Date", "Breakdown Date", "Repair Details", "Parts Replaced", "Next Due", "Status"]
    ];

    const tableRows = historyList.map((item, index) => [
      index + 1,
      item.equipment_id,
      item.equipment_name,
      item.model,
      item.serial_no,
      item.department,
      item.purchase_date,
      item.installation_date,
      item.running_hours,
      item.service_date,
      item.breakdown_date,
      item.repair_details,
      item.parts_replaced,
      item.next_service_due,
      item.status
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 26,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 }
    });

    const filenameDate = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
    doc.save(`Equipment_History_Register_${filenameDate}.pdf`);
  };

  const handleOpenAddModal = () => {
    setSelectedEquipment(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setSelectedEquipment(item);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('running')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
          <CheckCircle2 size={12} /> Running
        </span>
      );
    } else if (s.includes('repair') || s.includes('breakdown')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
          <AlertTriangle size={12} /> Under Repair
        </span>
      );
    } else if (s.includes('due') || s.includes('pending')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock size={12} /> Maintenance Due
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          {status}
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 lg:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
            <Wrench size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Equipment History Register</h1>
            <p className="text-xs text-gray-500 font-medium">
              Complete equipment lifespan, repair history & preventive maintenance tracking
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
          >
            <FileText size={16} />
            Export PDF
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus size={18} />
            Add Equipment
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, Name, Model, Serial..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              <option value="all">All Departments</option>
              <option value="Mining">Mining</option>
              <option value="Transport">Transport</option>
              <option value="Operations">Operations</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Mechanical">Mechanical</option>
            </select>
          </div>

          {/* Division Filter */}
          <div className="relative">
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              <option value="all">All Divisions</option>
              <option value="Mining Division">Mining Division</option>
              <option value="Plant Operations">Plant Operations</option>
              <option value="Logistics">Logistics</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="Running">Running</option>
              <option value="Under Repair">Under Repair</option>
              <option value="Maintenance Due">Maintenance Due</option>
            </select>
          </div>
        </div>
      </div>

      {/* Equipment History Register Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-3 text-center w-12">S.No.</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[100px]">Equipment ID</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[140px]">Equipment Name</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[120px]">Make / Model</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[130px]">Serial No.</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[110px]">Department</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[100px]">Purchase Date</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[100px]">Install. Date</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-center min-w-[90px]">Run Hrs</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[100px]">Service Date</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[110px]">Breakdown Date</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[160px]">Repair Details</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[140px]">Parts Replaced</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[110px]">Next Service Due</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-center min-w-[130px]">Status</th>
                <th className="py-3.5 px-3 whitespace-nowrap min-w-[130px]">Remarks</th>
                <th className="py-3.5 px-3 text-center min-w-[70px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="17" className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-blue-600" size={24} />
                      <span>Loading equipment history records...</span>
                    </div>
                  </td>
                </tr>
              ) : historyList.length > 0 ? (
                historyList.map((item, index) => (
                  <tr key={item.equipment_id || index} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-gray-500">{item.s_no}</td>
                    <td className="py-3 px-3 font-bold text-blue-600 whitespace-nowrap">{item.equipment_id}</td>
                    <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">{item.equipment_name}</td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{item.model}</td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap font-mono">{item.serial_no}</td>
                    <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{item.department}</td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{item.purchase_date}</td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{item.installation_date}</td>
                    <td className="py-3 px-3 text-center font-bold text-gray-800 whitespace-nowrap">{item.running_hours}</td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{item.service_date}</td>
                    <td className="py-3 px-3 text-red-600 font-medium whitespace-nowrap">{item.breakdown_date}</td>
                    <td className="py-3 px-3 text-gray-700 max-w-[200px] truncate" title={item.repair_details}>{item.repair_details}</td>
                    <td className="py-3 px-3 text-gray-700 max-w-[180px] truncate" title={item.parts_replaced}>{item.parts_replaced}</td>
                    <td className="py-3 px-3 text-blue-600 font-semibold whitespace-nowrap">{item.next_service_due}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-3 text-gray-600 max-w-[150px] truncate" title={item.remarks}>{item.remarks}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Equipment Master Details"
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="17" className="py-12 text-center text-gray-400 italic">
                    No equipment history records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Showing {historyList.length} equipment history records</span>
          <span className="font-semibold text-gray-600">* Powered By Botivate Maintenance Module</span>
        </div>
      </div>

      {/* Equipment Master Edit / Add Modal */}
      <EquipmentMasterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        equipment={selectedEquipment}
        onSuccess={loadData}
      />

      {/* Unified Asset & Operational Profile */}
      <AddProductModal
        isOpen={isAssetProfileOpen}
        onClose={() => setIsAssetProfileOpen(false)}
        product={assetProfileData}
        defaultSection={4}
      />
    </div>
  );
}
