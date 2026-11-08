import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSpinner, FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle,
  FaUsers, FaFileSignature, FaExclamationTriangle,
  FaUserGraduate, FaUserTie, FaSync,
  FaUniversity, FaIdCard, FaBook, FaChartLine
} from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const DEFAULT_ACTIVITY = {
  weekly: [0, 0, 0, 0, 0, 0, 0],
  monthly: Array(12).fill(0),
  labels: {
    weekly: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    monthly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  }
};

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({ title, value, color, icon: Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full rounded-xl border border-gray-100 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]"
  >
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
    </div>
    <p className="text-sm text-gray-500 mt-2">{title}</p>
  </button>
);

// ============================================
// PROGRESS BAR COMPONENT
// ============================================
const ProgressBar = ({ label, value, percentage, color, onClick }) => {
  const safePercent = Math.min(Math.max(percentage || 0, 0), 100);
  
  return (
    <div className="mb-3 cursor-pointer hover:opacity-80 transition" onClick={onClick}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700 truncate flex-1" title={label}>{label}</span>
        <span className="text-xs font-semibold text-gray-900 ml-2">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${safePercent}%` }}></div>
      </div>
    </div>
  );
};

// ============================================
// ACTIVITY CHART COMPONENT
// ============================================
const ActivityChart = ({ data, labels, ranges, type, onBarClick, isLoading = false }) => {
  const maxValue = Math.max(...data, 1);
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
        <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 animate-pulse"></div>
        <div className="h-3 w-24 bg-gray-100 rounded mx-auto"></div>
      </div>
    );
  }
  
  if (data.every(v => v === 0)) {
    return (
      <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
        <FaChartLine className="text-gray-300 text-3xl mx-auto mb-2" />
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{type === 'weekly' ? 'Requests by day' : 'Requests by month'}</h3>
          <p className="mt-1 text-xs text-gray-500">{type === 'weekly' ? 'Last 7 days' : 'Last 12 months'}</p>
        </div>
        <div className="text-right">
          <span className="block text-xl font-bold leading-none text-[#1B5E20]">{data.reduce((a, b) => a + b, 0).toLocaleString()}</span>
          <span className="mt-1 block text-[11px] text-gray-400">in this view</span>
        </div>
      </div>
      <div className="relative h-44 border-b border-gray-100 bg-[linear-gradient(to_bottom,transparent_24%,#eef2ee_25%,transparent_26%,transparent_49%,#eef2ee_50%,transparent_51%,transparent_74%,#eef2ee_75%,transparent_76%)]">
        <div className="flex h-full items-end justify-between gap-1.5 sm:gap-2">
        {data.map((value, idx) => {
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={`${labels[idx]}-${idx}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[10px] font-medium text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{value}</span>
              <button
                type="button"
                aria-label={`${labels[idx]}: ${value} requests`}
                title={`${labels[idx]}: ${value} requests`}
                className="w-full max-w-10 rounded-t-sm bg-gradient-to-t from-[#1B5E20] to-[#F9A825] transition-[height,filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20] focus-visible:ring-offset-2"
                style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                onClick={() => onBarClick?.(ranges?.[idx])}
              />
              <span className="mt-2 text-[10px] text-gray-500">{labels[idx]}</span>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activityType, setActivityType] = useState('weekly');
  const [dashboardData, setDashboardData] = useState({
    total: 0, pending: 0, processing: 0, ready: 0, claimed: 0, rejected: 0,
    documentDistribution: [], departmentDistribution: [], courseDistribution: [],
    yearLevelDistribution: [], userTypeDistribution: [], activityData: DEFAULT_ACTIVITY
  });

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) { setError('Not authenticated'); setLoading(false); return; }

      const response = await fetch(`${API_BASE_URL}/requests/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setDashboardData({
        total: data.total || 0,
        pending: data.pending || 0,
        processing: data.processing || 0,
        ready: data.ready || 0,
        claimed: data.claimed || 0,
        rejected: data.rejected || 0,
        documentDistribution: data.documentDistribution || [],
        departmentDistribution: data.departmentDistribution || [],
        courseDistribution: data.courseDistribution || [],
        yearLevelDistribution: data.yearLevelDistribution || [],
        userTypeDistribution: data.userTypeDistribution || [],
        activityData: data.activityData || DEFAULT_ACTIVITY
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboardStats(); }, [fetchDashboardStats]);

  // 🆕 UPDATED: Navigate to requests page with status filter
  const handleStatCardClick = (status) => {
    if (status === 'total') {
      navigate('/admin/requests');
    } else {
      // Navigate to requests page with the status as URL parameter
      // The Requests page will read this parameter and set the filter automatically
      navigate(`/admin/requests?status=${status}`);
    }
  };

  const handleProgressBarClick = (type, name) => {
    navigate(`/admin/requests?search=${encodeURIComponent(name)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1B5E20] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-md">
          <FaExclamationTriangle className="text-red-500 text-3xl mx-auto mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchDashboardStats} className="trac-button rounded-xl px-4 py-2 text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  const currentActivity = dashboardData.activityData[activityType === 'weekly' ? 'weekly' : 'monthly'];
  const currentLabels = dashboardData.activityData.labels[activityType === 'weekly' ? 'weekly' : 'monthly'];
  const currentRanges = dashboardData.activityData[activityType === 'weekly' ? 'weeklyRanges' : 'monthlyRanges'] || [];

  return (
    <div className="min-h-screen bg-[#f5f7f3]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        
        {/* ========== HEADER ========== */}
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#dfe8dc] pb-5">
          <div>
       
            <h1 className="text-2xl font-bold text-[#183c20]">Dashboard</h1>
          
          </div>
          
          <button 
            onClick={() => { setRefreshing(true); fetchDashboardStats(); }}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-[#9eb99e] hover:text-[#1B5E20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]"
            title="Refresh dashboard"
          >
            <FaSync className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ========== STATS CARDS - Clickable to Requests page with filter ========== */}
        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard title="Total" value={dashboardData.total} color="bg-blue-500" icon={FaFileAlt} onClick={() => handleStatCardClick('total')} />
          <StatCard title="Pending" value={dashboardData.pending} color="bg-amber-500" icon={FaClock} onClick={() => handleStatCardClick('pending')} />
          <StatCard title="Processing" value={dashboardData.processing} color="bg-indigo-500" icon={FaSpinner} onClick={() => handleStatCardClick('processing')} />
          <StatCard title="Ready" value={dashboardData.ready} color="bg-purple-500" icon={FaCheckCircle} onClick={() => handleStatCardClick('ready')} />
          <StatCard title="Claimed" value={dashboardData.claimed} color="bg-green-500" icon={FaCheckCircle} onClick={() => handleStatCardClick('claimed')} />
          <StatCard title="Rejected" value={dashboardData.rejected} color="bg-red-500" icon={FaTimesCircle} onClick={() => handleStatCardClick('rejected')} />
        </div>

        {/* ========== ACTIVITY CHART ========== */}
        <div className="mb-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-800">Activity Overview</h2>
            
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label="Activity time range">
              <button onClick={() => setActivityType('weekly')} aria-pressed={activityType === 'weekly'} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${activityType === 'weekly' ? 'bg-[#1B5E20] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>Weekly</button>
              <button onClick={() => setActivityType('monthly')} aria-pressed={activityType === 'monthly'} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${activityType === 'monthly' ? 'bg-[#1B5E20] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>Monthly</button>
            </div>
          </div>
          <ActivityChart
            data={currentActivity}
            labels={currentLabels}
            ranges={currentRanges}
            type={activityType}
            onBarClick={(range) => {
              if (!range) return;
              navigate(`/admin/requests?startDate=${encodeURIComponent(range.startDate)}&endDateExclusive=${encodeURIComponent(range.endDateExclusive)}`);
            }}
          />
        </div>

        {/* ========== DISTRIBUTION GRID ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3"><FaFileSignature className="text-[#1B5E20] text-sm" /><h3 className="font-semibold text-gray-800 text-sm">Document Requests</h3></div>
            <div className="max-h-64 overflow-y-auto">
              {dashboardData.documentDistribution.length > 0 ? (
                dashboardData.documentDistribution.slice(0, 6).map((doc, idx) => (
                  <ProgressBar key={idx} label={doc.name} value={doc.count} percentage={Number(doc.percentage)} color="bg-gradient-to-r from-[#1B5E20] to-[#F9A825]" onClick={() => handleProgressBarClick('document', doc.name)} />
                ))
              ) : <p className="text-gray-400 text-sm text-center py-6">No data</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3"><FaBook className="text-green-600 text-sm" /><h3 className="font-semibold text-gray-800 text-sm">Course Distribution</h3></div>
            <div className="max-h-64 overflow-y-auto">
              {dashboardData.courseDistribution.length > 0 ? (
                dashboardData.courseDistribution.slice(0, 6).map((course, idx) => (
                  <ProgressBar key={idx} label={course.name} value={course.count} percentage={Number(course.percentage)} color="bg-gradient-to-r from-green-500 to-emerald-600" onClick={() => handleProgressBarClick('course', course.name)} />
                ))
              ) : <p className="text-gray-400 text-sm text-center py-6">No data</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3"><FaUniversity className="text-blue-600 text-sm" /><h3 className="font-semibold text-gray-800 text-sm">Departments</h3></div>
            <div className="max-h-64 overflow-y-auto">
              {dashboardData.departmentDistribution.length > 0 ? (
                dashboardData.departmentDistribution.slice(0, 6).map((dept, idx) => (
                  <ProgressBar key={idx} label={dept.name} value={dept.count} percentage={Number(dept.percentage)} color="bg-gradient-to-r from-blue-500 to-blue-600" onClick={() => handleProgressBarClick('department', dept.name)} />
                ))
              ) : <p className="text-gray-400 text-sm text-center py-6">No data</p>}
            </div>
          </div>
        </div>

        
{/* ========== SECONDARY INSIGHTS ========== */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
  {/* User Distribution */}
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="flex items-center gap-2 mb-3">
      <FaUsers className="text-black text-sm" />
      <h3 className="font-semibold text-black text-sm">
        User Distribution
      </h3>
    </div>

    <div className="space-y-3">
      {dashboardData.userTypeDistribution.length > 0 ? (
        dashboardData.userTypeDistribution.map((item, idx) => {
          const Icon =
            item.type === 'Student' ? FaUserGraduate : FaUserTie;

          return (
            <div
              key={idx}
              className="flex items-center justify-between text-black"
            >
              <div className="flex items-center gap-2">
                <Icon className="text-black text-sm" />
                <span className="text-black text-sm">
                  {item.type}
                </span>
              </div>

              <div className="flex items-center gap-3 text-black">
                <span className="font-semibold">
                  {item.count}
                </span>
                <span className="text-black text-xs">
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-black text-sm text-center py-4">
          No data
        </p>
      )}
    </div>
  </div>

  {/* Quick Insights — unchanged */}
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <div className="flex items-center gap-2 mb-3">
      <FaIdCard className="text-[#1B5E20] text-sm" />
      <h3 className="font-semibold text-gray-800 text-sm">
        Quick Insights
      </h3>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Students</p>
        <p className="text-xl font-bold text-gray-800">
          {dashboardData.userTypeDistribution.find(
            u => u.type === 'Student'
          )?.count || 0}
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Alumni</p>
        <p className="text-xl font-bold text-gray-800">
          {dashboardData.userTypeDistribution.find(
            u => u.type === 'Alumni'
          )?.count || 0}
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Document Types</p>
        <p className="text-xl font-bold text-gray-800">
          {dashboardData.documentDistribution.filter(
            d => d.count > 0
          ).length}
        </p>
      </div>

      <div
        className="bg-amber-50 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition"
        onClick={() => handleStatCardClick('pending')}
      >
        <p className="text-xs text-amber-600">Pending Action</p>
        <p className="text-xl font-bold text-amber-700">
          {dashboardData.pending}
        </p>
      </div>
    </div>
  </div>
</div>


        {/* ========== WARNING BANNER ========== */}
       
      </div>
    </div>
  );
};

export default Dashboard;