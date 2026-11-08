import React, { useState, useEffect } from 'react';
import { 
  FaCheckCircle, 
  FaSpinner, 
  FaBoxOpen, 
  FaCheck, 
  FaTimes,
  FaUser,
  FaFileAlt,
  FaSearch,
  FaHistory,
  FaEye,
  FaFileExcel,
  FaFilePdf,
  FaTimesCircle,
  FaChevronLeft,
  FaChevronRight,
  FaRegClock,
  FaDownload
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SEMESTER_KEYS = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
  { value: 'summer', label: 'Summer' }
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, index) => CURRENT_YEAR - index);
const DEFAULT_ACTIVITY_CALENDAR = {
  schoolYearStartMonth: 8,
  semesters: {
    first: { startMonth: 8, endMonth: 12 },
    second: { startMonth: 1, endMonth: 5 },
    summer: { startMonth: 6, endMonth: 7 }
  }
};
const monthRangeLabel = (range) => {
  if (!range) return '';
  return `${MONTH_NAMES[range.startMonth - 1].slice(0, 3)}-${MONTH_NAMES[range.endMonth - 1].slice(0, 3)}`;
};
const getCurrentSchoolYearStart = (calendar) => (
  Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date()))
    - (Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'numeric' }).format(new Date())) < calendar.schoolYearStartMonth ? 1 : 0)
);

const buildActivityLogParams = ({ page, limit, filters }) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const values = {
    admin_id: filters.admin,
    action: filters.action,
    period_type: filters.yearType,
    year: filters.year,
    semester: filters.semester,
    month: filters.month,
    date: filters.date,
    start_date: filters.startDate,
    end_date: filters.endDate,
    search: filters.search.trim()
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, value);
  });
  return params;
};

const readJsonResponse = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.message || body.error || `Request failed (${response.status})`;
    const detail = body.error && body.error !== message ? ` Details: ${body.error}` : '';
    throw new Error(`${message}${detail} (HTTP ${response.status})`);
  }
  return body;
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    byAction: { approved: 0, processing: 0, ready: 0, claimed: 0, rejected: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterYearType, setFilterYearType] = useState('calendar');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activityCalendar, setActivityCalendar] = useState(DEFAULT_ACTIVITY_CALENDAR);
  const [refreshKey, setRefreshKey] = useState(0);

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isSuperAdmin = currentUser.role === 'super_admin';

  const periodLabel = [
    (filterYear || filterSemester || filterMonth) && (filterYearType === 'school'
      ? `${filterYear || getCurrentSchoolYearStart(activityCalendar)}-${Number(filterYear || getCurrentSchoolYearStart(activityCalendar)) + 1} school year`
      : `${filterYear || CURRENT_YEAR} calendar year`),
    filterSemester && `${SEMESTER_KEYS.find(item => item.value === filterSemester)?.label} (${monthRangeLabel(activityCalendar.semesters[filterSemester])})`,
    filterMonth && MONTH_NAMES[Number(filterMonth) - 1],
    filterDate && new Date(`${filterDate}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    (filterStartDate || filterEndDate) && `${filterStartDate || 'Start'} to ${filterEndDate || 'Present'}`
  ].filter(Boolean).join(' · ');

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const delay = searchTerm ? 350 : 0;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Not authenticated. Please sign in again.');
        if (!API_BASE_URL) throw new Error('Activity Logs API URL is not configured.');

        const filters = {
          admin: filterAdmin,
          action: filterAction,
          yearType: filterYearType,
          year: filterYear,
          semester: filterSemester,
          month: filterMonth,
          date: filterDate,
          startDate: filterStartDate,
          endDate: filterEndDate,
          search: searchTerm
        };
        const params = buildActivityLogParams({ page: pagination.page, limit: pagination.limit, filters });
        const response = await fetch(`${API_BASE_URL}/activity-logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        const data = await readJsonResponse(response);
        if (!current) return;
        setLogs(data.logs || []);
        setAdmins(data.admins || []);
        setSummary(data.summary || { total: 0, byAction: { approved: 0, processing: 0, ready: 0, claimed: 0, rejected: 0 } });
        setActivityCalendar(data.activity_calendar || DEFAULT_ACTIVITY_CALENDAR);
        setPagination(prev => ({ ...prev, total: data.pagination?.total || 0, pages: data.pagination?.pages || 0 }));
      } catch (requestError) {
        if (!current || requestError.name === 'AbortError') return;
        const fetchFailure = requestError instanceof TypeError;
        setError(fetchFailure
          ? `Unable to reach the Activity Logs API. Check the API URL, backend availability, and CORS configuration. ${requestError.message}`
          : requestError.message);
      } finally {
        if (current) setLoading(false);
      }
    }, delay);

    return () => {
      current = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [API_BASE_URL, filterAdmin, filterAction, filterYearType, filterYear, filterSemester, filterMonth, filterDate, filterStartDate, filterEndDate, searchTerm, pagination.page, pagination.limit, refreshKey]);

  useEffect(() => {
    setPagination(prev => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [filterAdmin, filterAction, filterYearType, filterYear, filterSemester, filterMonth, filterDate, filterStartDate, filterEndDate, searchTerm]);

  const fetchExportLogs = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated. Please sign in again.');
    if (!API_BASE_URL) throw new Error('Activity Logs API URL is not configured.');
    const filters = {
      admin: filterAdmin,
      action: filterAction,
      yearType: filterYearType,
      year: filterYear,
      semester: filterSemester,
      month: filterMonth,
      date: filterDate,
      startDate: filterStartDate,
      endDate: filterEndDate,
      search: searchTerm
    };
    const params = buildActivityLogParams({ page: 1, limit: 10000, filters });
    const response = await fetch(`${API_BASE_URL}/activity-logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await readJsonResponse(response);
    return data.logs || [];
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleLimitChange = (e) => {
    setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }));
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const allLogs = await fetchExportLogs();

      const headers = ['Date & Time', 'Admin', 'Action', 'Tracking Code', 'Document Type', 'From', 'To', 'Reason'];
      const rows = allLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.admins?.full_name || log.admins?.username || 'System',
        log.action,
        log.requests?.tracking_code || 'N/A',
        log.requests?.request_type || 'N/A',
        log.previous_status || '—',
        log.new_status,
        log.reason || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`CSV export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const allLogs = await fetchExportLogs();

      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.setTextColor(122, 0, 25);
      doc.text('TRAC Activity Logs Report', 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);

      const tableData = allLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.admins?.full_name || log.admins?.username || 'System',
        log.action,
        log.requests?.tracking_code || 'N/A',
        log.requests?.request_type || 'N/A',
        log.previous_status || '—',
        log.new_status
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Date & Time', 'Admin', 'Action', 'Tracking Code', 'Document', 'From', 'To']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [122, 0, 25], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2 }
      });

      doc.save(`activity_logs_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      setError(`PDF export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const getActionBadge = (action) => {
    const config = {
      'approved': { bg: 'bg-green-100', text: 'text-green-700', icon: <FaCheckCircle className="w-3 h-3" />, label: 'Approved' },
      'processing': { bg: 'bg-blue-100', text: 'text-blue-700', icon: <FaSpinner className="w-3 h-3" />, label: 'Processing' },
      'ready': { bg: 'bg-purple-100', text: 'text-purple-700', icon: <FaBoxOpen className="w-3 h-3" />, label: 'Ready' },
      'claimed': { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <FaCheck className="w-3 h-3" />, label: 'Claimed' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-700', icon: <FaTimes className="w-3 h-3" />, label: 'Rejected' }
    };
    const c = config[action] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FaRegClock className="w-3 h-3" />, label: action };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>
        {c.icon}
        {c.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1B5E20] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        
        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-r from-[#1B5E20] to-[#F9A825] rounded-xl flex items-center justify-center shadow-sm">
              <FaHistory className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#1B5E20] to-[#F9A825] bg-clip-text text-transparent tracking-tight">Activity Logs</h1>
              <p className="text-xs text-gray-500 mt-0.5">Track all administrative actions</p>
            </div>
          </div>
          <button onClick={() => setRefreshKey(value => value + 1)} aria-label="Refresh activity logs" className="p-2 text-gray-400 hover:text-[#1B5E20] rounded-lg hover:bg-[#F1F8E9] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* ========== SUMMARY CARDS ========== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 text-center border border-green-100 shadow-sm">
            <p className="text-2xl font-black text-[#1B5E20]">{summary.total}</p>
            <p className="text-xs text-gray-500">Total Actions</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-green-100 shadow-sm">
            <p className="text-2xl font-black text-[#2E7D32]">{summary.byAction.approved + summary.byAction.processing}</p>
            <p className="text-xs text-gray-500">Approved/Process</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-amber-100 shadow-sm">
            <p className="text-2xl font-black text-[#F57F17]">{summary.byAction.ready + summary.byAction.claimed}</p>
            <p className="text-xs text-gray-500">Ready/Claimed</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-red-100 shadow-sm">
            <p className="text-2xl font-black text-red-600">{summary.byAction.rejected}</p>
            <p className="text-xs text-gray-500">Rejected</p>
          </div>
        </div>

        {/* ========== FILTERS SECTION ========== */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search & period</label>
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-2 focus-within:border-[#1B5E20] focus-within:ring-1 focus-within:ring-[#1B5E20] lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search tracking code, student, ID number, or admin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg py-2 pl-8 pr-3 text-sm outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:border-l lg:border-gray-200 lg:pl-2">
              <select
                aria-label="Semester"
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#1B5E20]"
              >
                <option value="">Semester</option>
                {SEMESTER_KEYS.map(({ value, label }) => (
                  <option key={value} value={value}>{label} ({monthRangeLabel(activityCalendar.semesters[value])})</option>
                ))}
              </select>
              <select
                aria-label="Year type"
                value={filterYearType}
                onChange={(e) => setFilterYearType(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#1B5E20]"
              >
                <option value="calendar">Calendar year</option>
                <option value="school">School year</option>
              </select>
              <select
                aria-label="Year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#1B5E20]"
              >
                <option value="">Year</option>
                {YEAR_OPTIONS.map(optionYear => (
                  <option key={optionYear} value={optionYear}>
                    {filterYearType === 'school' ? `${optionYear}-${optionYear + 1}` : optionYear}
                  </option>
                ))}
              </select>
              <select
                aria-label="Month"
                value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); if (e.target.value) setFilterDate(''); }}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#1B5E20]"
              >
                <option value="">Month</option>
                {MONTH_NAMES.map((name, index) => <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>)}
              </select>
              <input
                type="date"
                aria-label="Specific date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#1B5E20]"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-gray-500">
              Start date
              <input
                type="date"
                aria-label="Start date"
                value={filterStartDate}
                max={filterEndDate || undefined}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-gray-800 outline-none focus:border-[#1B5E20]"
              />
            </label>
            <label className="block text-xs font-medium text-gray-500">
              End date
              <input
                type="date"
                aria-label="End date"
                value={filterEndDate}
                min={filterStartDate || undefined}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-gray-800 outline-none focus:border-[#1B5E20]"
              />
            </label>
          </div>
          {periodLabel && <p className="mt-2 text-xs text-gray-500">Showing: <span className="font-medium text-[#1B5E20]">{periodLabel}</span></p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Admin</label>
              <select
                value={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.value)}
                disabled={!isSuperAdmin}
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none ${!isSuperAdmin ? 'bg-gray-50' : ''}`}
              >
                <option value="">All Admins</option>
                {admins.map(admin => <option key={admin.id} value={admin.id}>{admin.full_name || admin.username}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none"
              >
                <option value="">All Actions</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="ready">Ready</option>
                <option value="claimed">Claimed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => {
                setFilterAdmin('');
                setFilterAction('');
                setFilterSemester('');
                setFilterYear('');
                setFilterYearType('calendar');
                setFilterMonth('');
                setFilterDate('');
                setFilterStartDate('');
                setFilterEndDate('');
                setSearchTerm('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
            >
              Clear Filters
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="px-3 py-1.5 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white rounded-lg text-xs flex items-center gap-2 hover:opacity-90"
              >
                <FaDownload className="text-xs" />
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 w-32">
                  <button onClick={exportToCSV} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2">
                    <FaFileExcel className="text-green-600" /> CSV
                  </button>
                  <button onClick={exportToPDF} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2">
                    <FaFilePdf className="text-red-600" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* ========== ACTIVITY LOGS TABLE ========== */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status Change</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <FaRegClock className="text-gray-300 text-3xl mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No activity logs found</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <FaUser className="text-[#1B5E20] text-xs" />
                          </div>
                          <span className="text-sm text-gray-800">{log.admins?.full_name || log.admins?.username || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">{log.requests?.tracking_code || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{log.requests?.request_type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">{log.previous_status || '—'}</span>
                          <span className="text-gray-300">→</span>
                          <span className={`text-xs font-medium ${log.new_status === 'rejected' ? 'text-red-600' : 'text-[#1B5E20]'}`}>{log.new_status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setSelectedLog(log); setShowDetailsModal(true); }} className="text-gray-400 hover:text-[#1B5E20]">
                          <FaEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <select value={pagination.limit} onChange={handleLimitChange} className="px-2 py-1 border rounded text-sm">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="p-1.5 border rounded disabled:opacity-40">
                  <FaChevronLeft className="w-3 h-3" />
                </button>
                <span className="px-3 py-1 text-sm">Page {pagination.page} of {pagination.pages}</span>
                <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages} className="p-1.5 border rounded disabled:opacity-40">
                  <FaChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] px-4 py-3 flex justify-between items-center">
                <h3 className="text-white font-semibold">Log Details</h3>
                <button onClick={() => setShowDetailsModal(false)} className="text-white/80 hover:text-white">
                  <FaTimesCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-gray-400">Tracking Code</p><p className="text-sm font-medium">{selectedLog.requests?.tracking_code || 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-400">Action</p>{getActionBadge(selectedLog.action)}</div>
                  <div><p className="text-xs text-gray-400">Document Type</p><p className="text-sm">{selectedLog.requests?.request_type || 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-400">Admin</p><p className="text-sm">{selectedLog.admins?.full_name || 'System'}</p></div>
                  <div className="col-span-2"><p className="text-xs text-gray-400">Status Change</p><p className="text-sm">{selectedLog.previous_status || '—'} → {selectedLog.new_status}</p></div>
                  {selectedLog.reason && <div className="col-span-2"><p className="text-xs text-gray-400">Reason</p><p className="text-sm text-red-600">{selectedLog.reason}</p></div>}
                  <div className="col-span-2"><p className="text-xs text-gray-400">Timestamp</p><p className="text-sm">{formatDate(selectedLog.created_at)}</p></div>
                </div>
              </div>
              <div className="p-3 border-t text-right">
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-1.5 bg-gray-100 rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}