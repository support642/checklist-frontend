import { authFetch } from "../utils/authFetch";
import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Table } from 'lucide-react';
import { canAccessModule } from '../utils/permissionUtils';
import {
  parseCSVFile,
  mapColumns,
  validateRowData,
  prepareImportData,
  getPreviewData,
  CHECKLIST_COLUMNS,
  DELEGATION_COLUMNS,
  MAINTENANCE_COLUMNS
} from '../utils/csvImportUtils';

const CSVImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState(''); // 'checklist' or 'delegation'
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState({ headers: [], data: [] });
  const [columnMapping, setColumnMapping] = useState({});
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const dbColumns = importType === 'checklist' 
    ? CHECKLIST_COLUMNS 
    : importType === 'maintenance' 
      ? MAINTENANCE_COLUMNS 
      : DELEGATION_COLUMNS;
  const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/import`;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setImportType('');
        setFile(null);
        setCsvData({ headers: [], data: [] });
        setColumnMapping({});
        setSelectedColumns([]);
        setError('');
        setValidationErrors([]);
      }, 300);
    }
  }, [isOpen]);

  const handleTypeSelect = (type) => {
    setImportType(type);
    setStep(2);
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);
    setIsLoading(true);
    setError('');

    try {
      const parsed = await parseCSVFile(uploadedFile);
      setCsvData(parsed);
      
      // Auto-map columns
      const mapping = mapColumns(parsed.headers, dbColumns);
      setColumnMapping(mapping);
      
      // Select all mapped columns by default (using Set for uniqueness)
      const mappedColumns = [...new Set(Object.values(mapping).filter(col => col !== null))];
      setSelectedColumns(mappedColumns);
      
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnMappingChange = (csvHeader, dbColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvHeader]: dbColumn
    }));
  };

  const handleColumnToggle = (columnKey) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(col => col !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError('');
    setValidationErrors([]);

    try {
      // Validate data
      const errors = [];
      csvData.data.forEach((row, index) => {
        const rowErrors = validateRowData(row, columnMapping, selectedColumns, dbColumns);
        if (rowErrors.length > 0) {
          errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
        }
      });

      if (errors.length > 0) {
        setValidationErrors(errors);
        setIsLoading(false);
        return;
      }

      // Prepare data for import
      const importData = prepareImportData(csvData.data, columnMapping, selectedColumns);

      // Call import API
      const endpoint = importType === 'checklist' 
        ? `${BASE_URL}/checklist`
        : importType === 'maintenance'
          ? `${BASE_URL}/maintenance`
          : `${BASE_URL}/delegation`;

      const response = await authFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(importData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const details = Array.isArray(result.skippedDoers) && result.skippedDoers.length > 0
          ? `. Not found / inactive: ${result.skippedDoers.join(', ')}`
          : Array.isArray(result.errors) && result.errors.length > 0
            ? `: ${result.errors.join('; ')}`
            : '';
        throw new Error((result.message || 'Import failed') + details);
      }

      // Success
      onSuccess && onSuccess(result);
      const skipped = Array.isArray(result.skippedDoers) ? result.skippedDoers : [];
      alert(
        skipped.length > 0
          ? `Imported ${result.count} tasks.\n\n${skipped.length} name(s) were NOT found as active users, so their ${result.skippedCount} row(s) were skipped:\n${skipped.join('\n')}\n\nFix these names (or create the users) and import those rows again.`
          : `Successfully imported ${result.count} tasks!`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to import data');
    } finally {
      setIsLoading(false);
    }
  };

  const previewData = getPreviewData(csvData.data, columnMapping, 5);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-purple-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-purple-700">Import Tasks from CSV</h2>
          <button
            onClick={onClose}
            className="text-purple-500 hover:text-purple-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Select Type' },
              { num: 2, label: 'Upload File' },
              { num: 3, label: 'Map Columns' },
              { num: 4, label: 'Review & Import' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex flex-col items-center ${idx > 0 ? 'ml-4' : ''}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s.num
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s.num ? <CheckCircle className="h-5 w-5" /> : s.num}
                  </div>
                  <span className="text-xs mt-1 text-gray-600">{s.label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={`h-1 w-16 mx-2 ${
                      step > s.num ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <p className="text-yellow-700 font-medium">Validation Errors</p>
              </div>
              <ul className="list-disc list-inside text-sm text-yellow-600 max-h-40 overflow-y-auto">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 1: Select Type */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">Select the type of tasks you want to import:</p>
              <div className="grid md:grid-cols-2 gap-4">
                {canAccessModule("checklist") && (
                  <button
                    onClick={() => handleTypeSelect('checklist')}
                    className="p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                  >
                    <Table className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold text-purple-700 mb-2">Checklist Tasks</h3>
                    <p className="text-sm text-gray-600">
                      Import recurring tasks with frequencies (daily, weekly, monthly, etc.)
                    </p>
                  </button>
                )}
                {canAccessModule("delegation") && (
                  <button
                    onClick={() => handleTypeSelect('delegation')}
                    className="p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                  >
                    <FileText className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold text-purple-700 mb-2">Delegation Tasks</h3>
                    <p className="text-sm text-gray-600">
                      Import one-time tasks or delegated assignments
                    </p>
                  </button>
                )}
                {canAccessModule("maintenance") && (
                  <button
                    onClick={() => handleTypeSelect('maintenance')}
                    className="p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                  >
                    <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors w-min mx-auto mb-3">
                      <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-blue-700 mb-2">Maintenance Tasks</h3>
                    <p className="text-sm text-gray-600">
                      Import recurring machine and equipment maintenance tasks
                    </p>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <Upload className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Upload CSV File for {importType === 'checklist' ? 'Checklist' : importType === 'maintenance' ? 'Maintenance' : 'Delegation'}
                </h3>
                <p className="text-gray-600 mb-6">
                  Select a CSV file with your task data. The file should include headers.
                </p>
              </div>
              
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-purple-300 border-dashed rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-10 w-10 text-purple-500 mb-3" />
                  <p className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                  {file && (
                    <p className="mt-2 text-sm text-purple-600 font-medium">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </label>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Required columns: <code className="bg-blue-100 px-1 rounded">name</code> (doer), <code className="bg-blue-100 px-1 rounded">task_description</code></li>
                  {importType === 'maintenance' && (
                    <li>Maintenance specific: <code className="bg-blue-100 px-1 rounded">machine_name</code>, <code className="bg-blue-100 px-1 rounded">part_name</code>, <code className="bg-blue-100 px-1 rounded">machine_area</code></li>
                  )}
                  <li>Optional columns: department, given_by, frequency, enable_reminder, etc.</li>
                  <li>First row should contain column headers</li>
                  <li>Date columns should be in YYYY-MM-DD format</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Map Columns */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Map CSV Columns to Database Fields
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-purple-700">CSV Column</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-purple-700">Maps To</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-purple-700">Sample Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.headers.map((header, idx) => (
                      <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-700">{header}</td>
                        <td className="px-4 py-2">
                          <select
                            value={columnMapping[header] || ''}
                            onChange={(e) => handleColumnMappingChange(header, e.target.value || null)}
                            className="w-full px-2 py-1 text-sm border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">-- Not Mapped --</option>
                            {dbColumns.map((col) => (
                              <option key={col.key} value={col.key}>
                                {col.label} {col.required ? '*' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                          {csvData.data[0]?.[header] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-purple-200 text-purple-700 rounded-md hover:bg-purple-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Next: Review Data
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Import */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Select Columns to Import & Review Data
              </h3>

              {/* Column Selection */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Select columns to include:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dbColumns.map((col) => {
                    const isMapped = Object.values(columnMapping).includes(col.key);
                    const isSelected = selectedColumns.includes(col.key);
                    
                    return (
                      <label
                        key={col.key}
                        className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${
                          isMapped
                            ? isSelected
                              ? 'bg-purple-100 border-purple-300'
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                            : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => isMapped && handleColumnToggle(col.key)}
                          disabled={!isMapped}
                          className="mr-2 h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">
                          {col.label}
                          {col.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Data Preview */}
              <div className="overflow-x-auto">
                <h4 className="font-semibold text-gray-700 mb-2">Preview (first 5 rows):</h4>
                <table className="min-w-full border border-gray-200 rounded-lg text-sm">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-purple-700">#</th>
                      {selectedColumns.map((colKey) => {
                        const col = dbColumns.find(c => c.key === colKey);
                        return (
                          <th key={colKey} className="px-3 py-2 text-left text-xs font-semibold text-purple-700">
                            {col?.label || colKey}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{rowIdx + 1}</td>
                        {selectedColumns.map((colKey) => {
                          const csvHeader = Object.keys(columnMapping).find(
                            h => columnMapping[h] === colKey
                          );
                          return (
                            <td key={colKey} className="px-3 py-2 text-gray-700 truncate max-w-xs">
                              {csvHeader ? (row[csvHeader] || '-') : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> {csvData.data.length} total rows will be imported. 
                  The <code className="bg-blue-100 px-1 rounded">task_id</code> will be auto-generated and 
                  <code className="bg-blue-100 px-1 rounded ml-1">created_at</code> will be set to the current timestamp.
                  {importType === 'maintenance' && (
                    <span className="ml-1">Machine part details will be resolved automatically.</span>
                  )}
                </p>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-purple-200 text-purple-700 rounded-md hover:bg-purple-50"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || selectedColumns.length === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Import {csvData.data.length} Tasks
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
