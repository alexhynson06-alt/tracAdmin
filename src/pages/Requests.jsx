import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  FaSearch, 
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight,
  FaRegClock,
  FaExclamationTriangle,
  FaFileAlt,
  FaUserGraduate,
  FaUserTie,
  FaSpinner,
  FaCheckCircle,
  FaBoxOpen,
  FaCheck,
  FaTimes as FaTimesIcon,
  FaCalendarDay,
  FaExclamationCircle,
  FaRegFileAlt,
  FaSearchPlus
} from 'react-icons/fa';
import StudentAvatar from '../components/StudentAvatar';

// ============================================
// STATUS BADGE COMPONENT
// ============================================
const StatusBadge = ({ status }) => {
  const config = {
    'pending': { bg: 'bg-amber-100', text: 'text-amber-700', icon: <FaRegClock className="w-3 h-3" />, label: 'Pending' },
    'approved': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <FaCheckCircle className="w-3 h-3" />, label: 'Approved' },
    'or_submitted': { bg: 'bg-blue-100', text: 'text-blue-700', icon: <FaCheckCircle className="w-3 h-3" />, label: 'OR Submitted' },
    'or_rejected': { bg: 'bg-rose-100', text: 'text-rose-700', icon: <FaTimesIcon className="w-3 h-3" />, label: 'OR Needs Correction' },
    'or_confirmed': { bg: 'bg-teal-100', text: 'text-teal-700', icon: <FaCheckCircle className="w-3 h-3" />, label: 'OR Confirmed' },
    'processing': { bg: 'bg-sky-100', text: 'text-sky-700', icon: <FaSpinner className="w-3 h-3" />, label: 'Processing' },
    'ready': { bg: 'bg-purple-100', text: 'text-purple-700', icon: <FaBoxOpen className="w-3 h-3" />, label: 'Ready' },
    'claimed': { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <FaCheck className="w-3 h-3" />, label: 'Claimed' },
    'rejected': { bg: 'bg-rose-100', text: 'text-rose-700', icon: <FaTimesIcon className="w-3 h-3" />, label: 'Rejected' }
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FaFileAlt className="w-3 h-3" />, label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
};

// ============================================
// CUSTOM VIEW DETAILS ICON COMPONENT
// ============================================
const ViewDetailsIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M17.5 17.5L21 21" 
      />
    </svg>
  );
};

// ============================================
// HELPER: GET LOCAL DATE STRING (YYYY-MM-DD)
// ============================================
const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================
// MAIN REQUESTS COMPONENT
// ============================================
const Requests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activityDateRange, setActivityDateRange] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [currentUser, setCurrentUser] = useState({
    role: 'staff',
    department: 'CCS'
  });

  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [dailyLimit, setDailyLimit] = useState(100);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Local today and yesterday
  const todayLocal = useMemo(() => getLocalDateString(new Date()), []);
  const yesterdayLocal = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
  }, []);

  // 🆕 READ URL PARAMETERS (from Dashboard clicks)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    const searchParam = params.get('search');
    const startDate = params.get('startDate');
    const endDateExclusive = params.get('endDateExclusive');

    setActivityDateRange(startDate && endDateExclusive ? { startDate, endDateExclusive } : null);

    if (startDate && endDateExclusive) {
      setFilter('all');
      setSearchTerm('');
      setIsSearching(false);
      setPagination(prev => ({ ...prev, page: 1 }));
    }
    
    if (statusParam && ['pending', 'approved', 'or_submitted', 'or_rejected', 'or_confirmed', 'processing', 'ready', 'claimed', 'rejected'].includes(statusParam)) {
      setFilter(statusParam);
      // Clear search term when filtering by status
      if (searchTerm) setSearchTerm('');
    }
    
    if (searchParam) {
      setSearchTerm(searchParam);
      // Clear filter when searching
      if (filter !== 'all') setFilter('all');
    }
    
  }, [location.search]);

  // Load user and daily limit
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const user = parsed.user || parsed;
        setCurrentUser({
          role: user.role || 'staff',
          department: user.department || 'CCS'
        });
      } catch (err) {
        console.error('Error parsing user:', err);
      }
    }
    fetchDailyLimit();
  }, []);

  const fetchDailyLimit = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDailyLimit(data.settings?.daily_queue_limit || 100);
      }
    } catch (err) {
      console.error('Failed to load daily limit', err);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // ============================
  // DATA PROCESSING (daily queue and overflow)
  // ============================
  const processedRequests = useMemo(() => {
    if (!requests.length) return [];

    // Sort by date ascending, then by queue_number
    const sorted = [...requests].sort((a, b) => {
      const dateA = getLocalDateString(a.date);
      const dateB = getLocalDateString(b.date);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.queue_number - b.queue_number;
    });

    // Determine overflow for today
    const enriched = sorted.map(r => {
      const dateKey = getLocalDateString(r.date);
      const isToday = dateKey === todayLocal;
      let isOverflow = false;
      if (isToday) {
        const dayRequests = sorted.filter(x => getLocalDateString(x.date) === todayLocal);
        const index = dayRequests.findIndex(x => x.id === r.id);
        isOverflow = index >= dailyLimit;
      }
      return { ...r, displayDate: dateKey, isOverflow };
    });
    return enriched;
  }, [requests, dailyLimit, todayLocal]);

  // Now Serving: first request with "processing" status (auto-detect)
  const displayNowServing = useMemo(() => {
    const processing = processedRequests.find(r => r.status === 'processing');
    return processing?.queue_number || null;
  }, [processedRequests]);

  // ============================
  // FETCHING
  // ============================
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated');

      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filter !== 'all' && { status: filter }),
        ...(activityDateRange && {
          startDate: activityDateRange.startDate,
          endDateExclusive: activityDateRange.endDateExclusive
        })
      });

      const response = await fetch(`${API_BASE_URL}/requests/getrequest?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setRequests(data.requests || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filter, activityDateRange, API_BASE_URL]);

  const searchRequests = useCallback(async (query) => {
    if (!query.trim()) { fetchRequests(); return; }
    setLoading(true);
    setIsSearching(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/requests/search?q=${encodeURIComponent(query)}&page=${pagination.page}&limit=${pagination.limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setRequests(data.results || []);
      setPagination(prev => ({ ...prev, total: data.total || 0, pages: Math.ceil((data.total || 0) / prev.limit) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, API_BASE_URL, fetchRequests]);

  const refreshRequests = () => {
    if (isSearching && searchTerm.trim()) {
      searchRequests(searchTerm);
      return;
    }
    fetchRequests();
  };

  useEffect(() => {
    if (!isSearching) fetchRequests();
  }, [filter, pagination.page, pagination.limit, fetchRequests, isSearching]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        setPagination(prev => ({ ...prev, page: 1 }));
        searchRequests(searchTerm);
      } else {
        setIsSearching(false);
        fetchRequests();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, searchRequests, fetchRequests]);

  const clearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchRequests();
  };

  const getUserTypeBadge = (type) => {
    if (type?.toLowerCase() === 'student') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 rounded-lg"><FaUserGraduate className="w-3 h-3" /> Student</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg"><FaUserTie className="w-3 h-3" /> Alumni</span>;
  };

  const isRestrictedDocument = (allowedRoles, studentType, requestAvailable) => {
    const role = studentType?.toLowerCase();
    return requestAvailable !== true || !allowedRoles?.some(allowedRole => allowedRole.toLowerCase() === role);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 }));
    if (isSearching) { setSearchTerm(''); setIsSearching(false); }
    // Update URL without reloading the page
    navigate(`/admin/requests?status=${newFilter === 'all' ? '' : newFilter}`, { replace: true });
  };

  // Handle row click to navigate to details
  const handleRowClick = (requestId) => {
    navigate(`/admin/requests/${requestId}`);
  };

  // Format display date using LOCAL dates
  const formatDisplayDate = (dateString, displayDate) => {
    if (!dateString) return '—';
    if (displayDate === todayLocal) return 'Today';
    if (displayDate === yesterdayLocal) return 'Yesterday';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const colSpan = currentUser.role === 'super_admin' ? 9 : 8;

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1B5E20] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading requests...</p>
        </div>
      </div>
    );
  }

  if (error && requests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-md">
          <FaExclamationTriangle className="text-red-500 text-3xl mx-auto mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchRequests} className="trac-button rounded-xl px-4 py-2 text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        
        {/* Toast */}
        {toast.show && (
          <div className={`fixed top-20 right-6 z-50 px-4 py-2 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            <span className="text-sm">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1B5E20] to-[#F9A825] bg-clip-text text-transparent">Document Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track all student document requests</p>
          </div>
          <button
            type="button"
            onClick={refreshRequests}
            disabled={loading}
            className="trac-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:cursor-not-allowed sm:px-4"
          >
            {loading && <FaSpinner className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Now Serving & Queue Info */}
        <div className="mb-5 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div className="flex items-center gap-2">
            <FaRegClock className="text-amber-600 text-sm" />
            <p className="text-sm text-amber-800">
              <strong>Now Serving:</strong> {displayNowServing ? (
                <span className="ml-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">#{displayNowServing}</span>
              ) : <span className="text-gray-500">None</span>}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'pending', 'approved', 'or_submitted', 'or_rejected', 'or_confirmed', 'processing', 'ready', 'claimed', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                filter === status
                  ? status === 'all' ? 'bg-[#1B5E20] text-white' :
                    status === 'pending' ? 'bg-amber-500 text-white' :
                    status === 'processing' ? 'bg-sky-500 text-white' :
                    status === 'ready' ? 'bg-purple-500 text-white' :
                    status === 'claimed' ? 'bg-emerald-500 text-white' :
                    'bg-rose-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mb-5">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID number, or document type..."
              className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
            />
            {searchTerm && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <FaTimes className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile request cards */}
        <div className="space-y-3 lg:hidden">
          {processedRequests.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
              <FaFileAlt className="text-gray-300 text-3xl mx-auto mb-2" />
              <p className="text-gray-500">No requests found</p>
            </div>
          ) : processedRequests.map((request) => {
            const restricted = isRestrictedDocument(request.allowedRoles, request.studentType, request.requestAvailable);
            const dateLabel = formatDisplayDate(request.date, request.displayDate);

            return (
              <article
                key={request.id}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(request.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(request.id);
                  }
                }}
                className={`cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#2E7D32]/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 ${restricted ? 'border-rose-200 bg-rose-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">#{request.queue_number}</span>
                  <StatusBadge status={request.status} />
                </div>
                <div className="mt-3 flex min-w-0 flex-col items-center text-center">
                  <StudentAvatar name={request.student} src={request.studentPhoto} />
                  <p className="mt-2 max-w-full truncate text-sm font-semibold text-gray-800">{request.student}</p>
                  <p className="text-xs text-gray-400">{request.id} · {request.studentType}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Document</p>
                    <p className="mt-1 break-words font-medium text-gray-800">{request.document}</p>
                    {restricted && <p className="mt-1 text-xs text-rose-500">Restricted for students</p>}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Requested</p>
                    <p className="mt-1 flex items-center gap-1 text-gray-600"><FaCalendarDay className="h-3 w-3 text-gray-400" />{dateLabel}</p>
                    <p className="mt-1 text-xs text-gray-400">Copies: {request.copies}</p>
                  </div>
                </div>

                {currentUser.role === 'super_admin' && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Institute / Course</p>
                    <p className="mt-1 text-sm font-medium text-[#1B5E20]">{request.institute || request.department || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{request.course || 'Course not listed'}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                  {request.isOverflow && <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700"><FaExclamationCircle className="h-3 w-3" />Overflow</span>}
                  <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-600"><ViewDetailsIcon className="h-4 w-4" />View details</span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Number</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Request ID</th>
                  {currentUser.role === 'super_admin' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Institute / Course</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Document Type</th>
                  <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-gray-500">Date</th>
                  <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
                 </tr>
              </thead>
              <tbody>
                {processedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-12 text-center">
                      <FaFileAlt className="text-gray-300 text-3xl mx-auto mb-2" />
                      <p className="text-gray-500">No requests found</p>
                    </td>
                  </tr>
                ) : (
                  processedRequests.map((request) => {
                    const restricted = isRestrictedDocument(request.allowedRoles, request.studentType, request.requestAvailable);
                    const dateLabel = formatDisplayDate(request.date, request.displayDate);
                    
                    return (
                      <tr 
                        key={request.id} 
                        className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-blue-50 ${restricted ? 'bg-rose-50/30' : ''}`}
                        onClick={() => handleRowClick(request.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">#{request.queue_number}</span>
                            {request.isOverflow && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1" title="Exceeded daily limit, may be processed later">
                                <FaExclamationCircle className="w-3 h-3" /> Overflow
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-mono text-[#1B5E20]">{request.id}</span>
                        </td>
                        {currentUser.role === 'super_admin' && (
                          <td className="px-4 py-3">
                            <div className="max-w-56">
                              <p className="text-sm font-medium text-[#1B5E20]">{request.institute || request.department || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{request.course || 'Course not listed'}</p>
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar name={request.student} src={request.studentPhoto} />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-800">{request.student}</div>
                              <div className="text-xs text-gray-400">Copies: {request.copies}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{getUserTypeBadge(request.studentType)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-800">{request.document}</div>
                          {restricted && <div className="text-xs text-rose-500">Restricted for students</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-500">
                          <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                            <FaCalendarDay className="text-gray-400 w-3 h-3" />
                            {dateLabel}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={request.status} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {/* View button - still here for clarity, but row click also works */}
                          <div className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg transition group">
                            <ViewDetailsIcon className="w-4 h-4" />
                            <span className="text-xs font-medium hidden sm:inline">View</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-sm text-gray-500">
                {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-2">
                <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="px-3 py-1 border rounded-lg disabled:opacity-40">
                  <FaChevronLeft className="w-3 h-3" />
                </button>
                <span className="px-3 py-1 bg-[#1B5E20] text-white rounded-xl text-sm">{pagination.page}</span>
                <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages} className="px-3 py-1 border rounded-lg disabled:opacity-40">
                  <FaChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Restricted Docs Notice */}
        <div className="mt-5 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> TOR, Diploma, CAV, Authentication are NOT AVAILABLE for current students. Only Alumni can request these documents.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Requests;