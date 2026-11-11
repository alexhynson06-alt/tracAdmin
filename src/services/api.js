// API Service for MSU-TCTO Registrar System
import axios from 'axios';
import { adminSupabase, clearAdminSessionCache } from './adminAuth';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // ✅ CHANGED: 'admin_token' to 'authToken'
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle specific error statuses
    if (error.response) {
      switch (error.response.status) {
        case 401:
          void adminSupabase?.auth.signOut();
          clearAdminSessionCache();
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden');
          break;
        case 404:
          // Not found
          console.error('Resource not found');
          break;
        case 500:
          // Server error
          console.error('Server error occurred');
          break;
        default:
          console.error('API Error:', error.response.status);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - please check your connection');
    } else {
      // Other errors
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials), // ✅ CHANGED: '/admin/auth/login' to '/auth/login'
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify'),
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
  changePassword: (data) => api.put('/auth/change-password', data),
  signup: (userData) => api.post('/auth/signup', userData),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
};

export const adminProfileAPI = {
  get: () => api.get('/admin/me'),
  update: (data) => api.patch('/admin/me', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/admin/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: () => api.delete('/admin/me/avatar'),
};

export const adminNotificationsAPI = {
  getMine: () => api.get('/admin/notifications'),
  markRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => api.patch('/admin/notifications/read-all'),
};

// Dashboard API - ✅ UPDATED: Points to correct backend endpoint
export const dashboardAPI = {
  getStats: () => api.get('/requests/dashboard-stats'), // ✅ CHANGED: '/admin/dashboard/stats' to '/requests/dashboard-stats'
  getRecentRequests: (limit = 10) => api.get(`/requests?limit=${limit}`), // ✅ UPDATED
  getActivityLog: () => api.get('/requests/activity'), // ✅ UPDATED
  getSystemStatus: () => api.get('/requests/system-status'), // ✅ UPDATED
};

// Requests API - ✅ UPDATED: Points to correct backend endpoints
export const requestsAPI = {
  getAllRequests: (params) => api.get('/requests/getrequest', { params }), // ✅ UPDATED
  getAllandAllRequests: () => api.get('/requests/requests/all'), // ✅ NEW: For admin to see all requests
  getRequestById: (id) => api.get(`/requests/requestbyid/${id}`), // ✅ UPDATED
  createRequest: (data) => api.post('/requests/request', data), // ✅ UPDATED
  updateRequestStatus: (id, status, reason) => 
    api.put(`/requests/${id}/status`, { status, reason }), // ✅ UPDATED: matches updateStatusController
  getOfficialReceipt: (id) => api.get(`/requests/${id}/or`),
  confirmOfficialReceipt: (id) => api.put(`/requests/${id}/or/confirm`),
  rejectOfficialReceipt: (id, reason) => api.put(`/requests/${id}/or/reject`, { reason }),
  getUserRequests: () => api.get('/requests/user/requests'), // ✅ NEW: For student to see their requests
  searchRequests: (query) => api.get(`/requests/search?q=${query}`), // ✅ NEW
  trackRequest: (trackingCode) => api.get(`/requests/track/${trackingCode}`), // ✅ NEW: Public tracking
};

// Admin Users API - ✅ KEPT for admin management
export const adminUsersAPI = {
  getAllAdmins: () => api.get('/admin/users'),
  getAdminById: (id) => api.get(`/admin/users/${id}`),
  createAdmin: (data) => api.post('/admin/users', data),
  updateAdmin: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteAdmin: (id) => api.delete(`/admin/users/${id}`),
  updateAdminRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  resetAdminPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  getAdminPermissions: () => api.get('/admin/users/permissions'),
};

// Activity Logs API - ✅ NEW: For admin activity tracking
export const activityLogsAPI = {
  getLogs: (params) => api.get('/activity-logs', { params }),
  getUserActivity: (userId) => api.get(`/activity-logs/user/${userId}`),
  getRequestActivity: (requestId) => api.get(`/activity-logs/request/${requestId}`),
  getAdminActivity: (adminId) => api.get(`/activity-logs/admin/${adminId}`),
};

// Email Logs API - ✅ NEW: For email notification tracking
export const emailLogsAPI = {
  getLogs: (params) => api.get('/email-logs', { params }),
  getRequestLogs: (requestId) => api.get(`/email-logs/request/${requestId}`),
  resendEmail: (logId) => api.post(`/email-logs/${logId}/resend`),
};

// Status Update API - ✅ NEW: For status transitions
export const statusAPI = {
  updateStatus: (id, status, reason) => api.put(`/requests/${id}/status`, { status, reason }),
  bulkUpdateStatus: (requestIds, status, reason) => api.post('/requests/bulk-status', { requestIds, status, reason }),
  getStatusHistory: (id) => api.get(`/requests/${id}/history`),
};

// Students API - ✅ UPDATED: Uses users table
export const studentsAPI = {
  getAllStudents: (params) => api.get('/users', { params }),
  getStudentById: (id) => api.get(`/users/${id}`),
  updateStudent: (id, data) => api.put(`/users/${id}`, data),
  getStudentRequests: (studentId) => api.get(`/users/${studentId}/requests`),
};

// Documents API - ✅ KEPT for future use
export const documentsAPI = {
  getDocumentTypes: () => api.get('/document-types'),
  createDocumentType: (data) => api.post('/document-types', data),
  updateDocumentType: (id, data) => api.put(`/document-types/${id}`, data),
  deleteDocumentType: (id) => api.delete(`/document-types/${id}`),
  getDocumentTemplates: () => api.get('/document-templates'),
  uploadTemplate: (data) => api.post('/document-templates/upload', data),
};

// SMS API - ✅ KEPT for future use
export const smsAPI = {
  getSMSLogs: (params) => api.get('/sms/logs', { params }),
  sendSMS: (data) => api.post('/sms/send', data),
  sendBulkSMS: (data) => api.post('/sms/send-bulk', data),
  getSMSBalance: () => api.get('/sms/balance'),
  getSMSTemplates: () => api.get('/sms/templates'),
  updateSMSTemplate: (id, data) => api.put(`/sms/templates/${id}`, data),
  testSMS: (data) => api.post('/sms/test', data),
};

// Reports API - ✅ KEPT for future use
export const reportsAPI = {
  generateReport: (type, params) => 
    api.get(`/reports/${type}`, { params, responseType: 'blob' }),
  getAnalytics: (params) => api.get('/reports/analytics', { params }),
  getMetrics: () => api.get('/reports/metrics'),
  exportData: (format, params) => 
    api.get(`/reports/export/${format}`, { params, responseType: 'blob' }),
};

// Settings API - ✅ KEPT for future use
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  testSMSService: () => api.post('/settings/test-sms'),
  testEmailService: () => api.post('/settings/test-email'),
  backupDatabase: () => api.post('/settings/backup'),
  getSystemInfo: () => api.get('/settings/system-info'),
};

// File Upload API - ✅ KEPT for future use
export const uploadAPI = {
  uploadFile: (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Utility functions
export const apiUtils = {
  // Format query parameters
  formatQueryParams: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    return query.toString();
  },
  
  // Download file from blob
  downloadFile: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  
  // Set auth token
  setAuthToken: (token) => {
    localStorage.setItem('authToken', token); // ✅ CHANGED: 'admin_token' to 'authToken'
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  
  // Clear auth token
  clearAuthToken: () => {
    void adminSupabase?.auth.signOut();
    clearAdminSessionCache();
    delete api.defaults.headers.common['Authorization'];
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken'); // ✅ CHANGED: 'admin_token' to 'authToken'
  },
};

// Export default api instance
export default api;