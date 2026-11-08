import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import Modal, { ConfirmationModal } from '../components/Modal';
import StudentAvatar from '../components/StudentAvatar';
import { 
  FaArrowLeft, 
  FaUser, 
  FaFileAlt, 
  FaEnvelope, 
  FaCalendarAlt, 
  FaCopy,
  FaMoneyBillWave,
  FaClock,
  FaGraduationCap,
  FaBuilding,
  FaIdCard,
  FaUserTag,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaBoxOpen,
  FaSpinner,
  FaBan,
  FaHistory,
  FaInfoCircle
  ,FaImage
} from 'react-icons/fa';

const RequestDetails = () => {
  const { id } = useParams();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showOrImageModal, setShowOrImageModal] = useState(false);
  const [showStudentPhotoModal, setShowStudentPhotoModal] = useState(false);
  const [studentPhotoPreviewFailed, setStudentPhotoPreviewFailed] = useState(false);
  const [orImagePreview, setOrImagePreview] = useState(null);
  const [orSubmissions, setOrSubmissions] = useState([]);
  const [loadingOrHistory, setLoadingOrHistory] = useState(false);
  const [orHistoryError, setOrHistoryError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [orReason, setOrReason] = useState('');
  
  // 🆕 State to track if approved has been clicked
  const [isApprovedOrProcessing, setIsApprovedOrProcessing] = useState(false);
  
  // 🆕 Toast notification
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const fetchOrSubmissionHistory = async (requestUuid) => {
    setLoadingOrHistory(true);
    setOrHistoryError('');
    try {
      const response = await fetch(`${API_BASE_URL}/requests/${requestUuid}/or/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load OR history.');
      setOrSubmissions(data.submissions || []);
    } catch (historyError) {
      setOrHistoryError(historyError.message || 'Failed to load OR history.');
    } finally {
      setLoadingOrHistory(false);
    }
  };

  const openOrImagePreview = (url, title) => {
    setOrImagePreview({ url, title });
    setShowOrImageModal(true);
  };

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('You are not logged in. Please login to continue.');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/requests/requestbyid/${id}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || 'Failed to fetch request');

        setRequest(data);
        setStatus(data.status);
        fetchOrSubmissionHistory(data.uuid);

        // 🆕 Check if status is approved, processing, ready, claimed, or rejected
        const approvedOrProcessing = ['approved', 'processing', 'ready', 'claimed'].includes(data.status);
        setIsApprovedOrProcessing(approvedOrProcessing);
        
        const role = data.studentType?.toLowerCase();
        const restricted = data.requestAvailable !== true || !data.allowedRoles?.some(allowedRole => allowedRole.toLowerCase() === role);
        setIsRestricted(restricted);

      } catch (err) {
        setError(err.message || 'Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRequest();
  }, [id, API_BASE_URL]);

  const getYearDisplay = () => {
    if (!request) return 'N/A';
    if (request.studentType === 'Alumni') return `Graduated ${request.yearGraduated || 'N/A'}`;
    return request.yearLevel || 'N/A';
  };

  const emailTemplates = {
    approved: `Your request {REQ_ID} for {DOCUMENT} is APPROVED and now PROCESSING.\nAmount to pay: ₱{AMOUNT}\nPayment: Pay at Cashier Office on your claim date.\nProcessing time: {PROCESSING_TIME}\nWe will notify you once ready for pickup.\nThank you!`,
    ready: `Your {DOCUMENT} is READY FOR PICKUP!\n1. Go to Cashier Office: Pay ₱{AMOUNT} & get Official Receipt\n2. Go to Registrar Office: Present OR + Valid ID\n3. Claim your document\nClaim within 30 days.\nThank you!`,
    rejected: `Your request {REQ_ID} for {DOCUMENT} has been REJECTED.\nReason: {REASON}\nIf you have questions, please contact the Registrar's Office.\nThank you.`
  };

  const updateStatus = async (newStatus, reason = null) => {
    try {
      const token = localStorage.getItem('authToken');
      const payload = { status: newStatus, ...(reason && { reason }) };

      const response = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update status');

      setStatus(newStatus);
      
      // 🆕 Update the approved/processing state based on new status
      if (['approved', 'processing', 'ready', 'claimed'].includes(newStatus)) {
        setIsApprovedOrProcessing(true);
      }
      
      const newHistory = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        action: newStatus === 'approved' ? 'Request approved' :
                newStatus === 'processing' ? 'Request processing started' :
                newStatus === 'ready' ? 'Document ready for pickup' :
                newStatus === 'claimed' ? 'Document claimed by student' :
                newStatus === 'rejected' ? `Request rejected: ${reason}` : newStatus,
        user: 'Admin User',
        reason: reason
      };
      
      setRequest(prev => ({ ...prev, history: [newHistory, ...(prev.history || [])] }));
      return true;

    } catch (err) {
      throw err;
    }
  };

  const handleStatusChange = (newStatus) => {
    setSelectedStatus(newStatus);
    if (newStatus === 'approved') {
      setEmailMessage(emailTemplates.approved
        .replace('{REQ_ID}', request.id)
        .replace('{DOCUMENT}', request.documentType)
        .replace('{AMOUNT}', request.amount)
        .replace('{PROCESSING_TIME}', request.processingTime));
      setShowStatusModal(true);
    } else if (newStatus === 'ready') {
      setEmailMessage(emailTemplates.ready
        .replace('{DOCUMENT}', request.documentType)
        .replace('{AMOUNT}', request.amount));
      setShowStatusModal(true);
    }
  };

  const handleRejectClick = () => setShowRejectModal(true);
  const handleClaimClick = () => setShowClaimModal(true);

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }
    const success = await updateStatus('rejected', rejectReason);
    if (success) {
      showToast(`Request rejected. Notification sent to ${request.email}`, 'success');
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const reviewOfficialReceipt = async (action) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/requests/${id}/or/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { reason: orReason } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to review official receipt.');
      setRequest(previous => ({ ...previous, ...data.request }));
      setStatus(data.request.status);
      fetchOrSubmissionHistory(data.request.id || request.uuid);
      setOrReason('');
      showToast(action === 'confirm' ? 'Official receipt confirmed.' : 'Official receipt rejected.');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const confirmClaim = async () => {
    setUpdating(true);
    try {
      const success = await updateStatus('claimed');
      if (success) {
        showToast('Request marked as claimed. No notification sent to student.', 'info');
        setShowClaimModal(false);
      }
    } catch (error) {
      showToast(error.message || 'Failed to mark request as claimed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const confirmStatusChange = async () => {
    setUpdating(true);
    try {
      if (selectedStatus === 'approved') {
        await updateStatus('approved');
        showToast(`Approval email sent to ${request.email}`, 'success');
      } else if (selectedStatus === 'ready') {
        await updateStatus('ready');
        showToast(`Email sent to ${request.email}`, 'success');
      }
      setShowStatusModal(false);
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getUserTypeBadge = (type) => {
    switch(type) {
      case 'Student': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'Alumni': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F8E9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm font-medium">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Failed to Load Request</h3>
          <p className="text-gray-500 mb-6">{error || 'Request not found'}</p>
          <Link to="/admin/requests" className="inline-flex items-center px-5 py-2.5 bg-[#1B5E20] text-white rounded-xl font-medium hover:bg-[#0D3B10] transition">
            <FaArrowLeft className="mr-2" /> Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  const statusSteps = [
    { key: 'pending', label: 'Pending', icon: <FaClock /> },
    { key: 'approved', label: 'Approved', icon: <FaCheckCircle /> },
    { key: 'or_submitted', label: 'OR Review', icon: <FaImage /> },
    { key: 'or_confirmed', label: 'OR Confirmed', icon: <FaCheckCircle /> },
    { key: 'processing', label: 'Processing', icon: <FaSpinner /> },
    { key: 'ready', label: 'Ready', icon: <FaBoxOpen /> },
    { key: 'claimed', label: 'Claimed', icon: <FaCheckCircle /> }
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === status);

  // 🆕 Determine if Reject button should be disabled
  const isRejectDisabled = isApprovedOrProcessing || status === 'claimed' || status === 'rejected' || updating;

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-500' : 
          toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          {toast.type === 'success' ? <FaCheckCircle /> : toast.type === 'error' ? <FaExclamationTriangle /> : <FaInfoCircle />}
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <Link to="/admin/requests" className="inline-flex items-center text-sm text-gray-500 hover:text-[#1B5E20] mb-4 transition group">
            <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Requests
          </Link>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  status === 'pending' ? 'bg-amber-100 text-amber-600' :
                  ['approved','or_submitted','or_confirmed','processing'].includes(status) ? 'bg-sky-100 text-sky-600' :
                  status === 'ready' ? 'bg-purple-100 text-purple-600' :
                  status === 'claimed' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  <FaFileAlt className="text-xl" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-xl font-bold text-gray-800">{request.documentType}</h1>
                    <StatusBadge status={status} size="md" />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                  
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getUserTypeBadge(request.studentType)}`}>
                      {request.studentType}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Queue Number Badge */}
              <div className="flex items-center gap-3">
                <div className="text-center bg-gradient-to-br from-[#1B5E20]/5 to-[#F9A825]/10 rounded-xl px-5 py-3 border border-[#1B5E20]/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Queue #</p>
                  <p className="text-2xl font-black text-[#1B5E20]">{request.queue_number || '—'}</p>
                </div>
              </div>
            </div>
            
            {/* Status Progress Bar */}
            <div className="mt-6 border-t border-gray-100 pt-6">
              <div className="grid grid-cols-7 gap-1">
                {statusSteps.map((step, index) => {
                  const isCompleted = currentStepIndex >= index && status !== 'rejected';
                  const isCurrent = statusSteps[currentStepIndex]?.key === step.key;
                  return (
                    <div key={step.key} className="relative flex min-w-0 flex-col items-center">
                      {index < statusSteps.length - 1 && (
                        <div className={`absolute left-1/2 top-4 h-0.5 w-full transition ${isCompleted ? 'bg-[#1B5E20]' : 'bg-gray-200'}`} />
                      )}
                      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                        isCompleted ? 'bg-[#1B5E20] text-white' : 
                        isCurrent ? 'bg-[#1B5E20]/20 text-[#1B5E20] ring-2 ring-[#1B5E20]' : 
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? <FaCheckCircle className="text-xs" /> : index + 1}
                      </div>
                      <span className="mt-2 w-full break-words text-center text-[10px] font-medium leading-tight text-gray-400">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Restricted Warning */}
  {isRestricted && (
    <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4">
      <div className="flex items-start gap-3">
        <FaBan className="text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-red-800 text-sm">
            Restricted Document
          </p>
          <p className="text-sm text-red-700 mt-1">
            <strong>{request.documentType}</strong> is not available for{" "}
            <strong>{request.studentType}</strong> under the current request catalog.
          </p>
          <button
            onClick={handleRejectClick}
            disabled={isRejectDisabled || updating}
            className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject Request
          </button>
        </div>
      </div>
    </div>
  )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Student Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FaUser className="text-[#1B5E20]" /> Student Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
                    {request.studentPhoto ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentPhotoPreviewFailed(false);
                          setShowStudentPhotoModal(true);
                        }}
                        title="View profile photo"
                        aria-label={`View ${request.studentName || 'student'} profile photo`}
                        className="shrink-0 cursor-zoom-in rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E20]"
                      >
                        <StudentAvatar name={request.studentName} src={request.studentPhoto} size="md" />
                      </button>
                    ) : (
                      <StudentAvatar name={request.studentName} size="md" />
                    )}
                    <InfoItem icon={<FaUserTag />} label="Full Name" value={request.studentName} />
                  </div>
                  <InfoItem icon={<FaIdCard />} label="Student ID" value={request.studentId} />
                  <InfoItem icon={<FaBuilding />} label="Institute" value={request.institute || request.department || 'N/A'} />
                  <InfoItem icon={<FaGraduationCap />} label="Course" value={request.course || 'N/A'} />
                  <InfoItem icon={<FaCalendarAlt />} label={request.studentType === 'Alumni' ? 'Year Graduated' : 'Year Level'} value={getYearDisplay()} />
                  <InfoItem icon={<FaEnvelope />} label="Email" value={request.email} isEmail />
                </div>
              </div>
            </div>

            {/* Document Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FaFileAlt className="text-[#1B5E20]" /> Document Details</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <InfoItem icon={<FaCopy />} label="Copies" value={request.copies} />
                  <InfoItem icon={<FaMoneyBillWave />} label="Amount" value={`₱${request.amount}`} highlight />
                  <InfoItem icon={<FaCalendarAlt />} label="Request Date" value={request.requestDate} />
                  <div className="sm:col-span-3">
                    <InfoItem icon={<FaFileAlt />} label="Purpose" value={request.purpose} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {(request.or_image_url || orSubmissions.length > 0 || ['or_submitted', 'or_rejected', 'or_confirmed'].includes(status)) && (
              <div className="bg-white rounded-2xl shadow-sm border border-green-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2"><FaImage className="text-[#1B5E20]" /> Official Receipt</h2>
                  <p className="text-xs text-gray-500 mt-1">Latest submission and previous review attempts.</p>
                </div>
                <div className="p-4 space-y-4">
                  {request.or_image_url ? (
                    <button
                      type="button"
                      onClick={() => openOrImagePreview(request.or_image_url, `Latest Official Receipt${request.or_number ? ` ${request.or_number}` : ''}`)}
                      className="block w-full cursor-zoom-in rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                      aria-label="View latest official receipt image"
                    >
                      <img src={request.or_image_url} alt="Uploaded official receipt" className="max-h-72 w-full rounded-lg border border-gray-200 object-contain" />
                    </button>
                  ) : <p className="text-sm text-gray-500">No OR image available.</p>}
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"><InfoItem label="OR Number" value={request.or_number} /><InfoItem label="Uploaded" value={request.or_uploaded_at ? new Date(request.or_uploaded_at).toLocaleString() : '—'} /></div>
                  {request.or_rejection_reason && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"><strong>Previous reason:</strong> {request.or_rejection_reason}</div>}
                  {status === 'or_submitted' && <>
                    <button onClick={() => reviewOfficialReceipt('confirm')} disabled={updating} className="w-full rounded-lg bg-[#2E7D32] px-4 py-3 font-semibold text-white disabled:opacity-60">Confirm OR</button>
                    <textarea value={orReason} onChange={event => setOrReason(event.target.value)} placeholder="Reason for requesting a corrected OR" rows="3" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <button onClick={() => reviewOfficialReceipt('reject')} disabled={updating || !orReason.trim()} className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Reject OR</button>
                  </>}
                  {status === 'or_confirmed' && <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">OR confirmed. This request can now start processing.</p>}

                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="mb-3 text-sm font-semibold text-gray-800">Submission history</h3>
                    {loadingOrHistory && <p className="text-sm text-gray-500">Loading receipt history...</p>}
                    {orHistoryError && <p className="text-sm text-red-700" role="alert">{orHistoryError}</p>}
                    {!loadingOrHistory && !orHistoryError && orSubmissions.length === 0 && <p className="text-sm text-gray-500">No prior submissions recorded.</p>}
                    <div className="divide-y divide-gray-100">
                      {orSubmissions.map((submission, index) => {
                        const isLatest = index === orSubmissions.length - 1;
                        const reviewLabel = submission.decision === 'confirmed'
                          ? 'Confirmed'
                          : submission.decision === 'rejected'
                            ? 'Rejected'
                            : 'Awaiting review';
                        return (
                          <div key={submission.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                            <button
                              type="button"
                              onClick={() => openOrImagePreview(submission.image_url, `OR Attempt ${submission.attempt_number}`)}
                              className="h-16 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded border border-gray-200 bg-gray-50"
                              aria-label={`View OR attempt ${submission.attempt_number}`}
                            >
                              <img src={submission.image_url} alt={`OR attempt ${submission.attempt_number}`} className="h-full w-full object-cover" />
                            </button>
                            <div className="min-w-0 flex-1 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-gray-800">Attempt {submission.attempt_number}</span>
                                {isLatest && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Latest</span>}
                                <span className={`rounded px-2 py-0.5 text-xs font-medium ${submission.decision === 'rejected' ? 'bg-red-100 text-red-800' : submission.decision === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{reviewLabel}</span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">OR {submission.or_number} · Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}</p>
                              <p className="mt-1 text-xs text-gray-600">Processed by {submission.administrator || 'Awaiting administrator processing'}</p>
                              {submission.rejection_reason && <p className="mt-1 break-words text-xs text-red-700">Reason: {submission.rejection_reason}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Status Actions */}
            {!['claimed','rejected'].includes(status) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="font-bold text-gray-800">Update Status</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Email sent automatically for Approve & Ready</p>
                </div>
                <div className="p-4 space-y-2.5">
                  {!isRestricted && (
                    <>
                      <ActionButton 
                        step={1} 
                        color="blue" 
                        label="Approve Request" 
                        desc="Approve and request an Official Receipt"
                        disabled={status !== 'pending' || updating} 
                        onClick={() => handleStatusChange('approved')} 
                      />
                      <ActionButton
                        step={2}
                        color="blue"
                        label="Start Processing"
                        desc="Process the confirmed OR"
                        disabled={status !== 'or_confirmed' || updating}
                        onClick={() => updateStatus('processing').catch(error => showToast(error.message, 'error'))}
                      />
                      <ActionButton 
                        step={3} 
                        color="purple" 
                        label="Ready for Pickup" 
                        desc="Document is ready to be claimed"
                        disabled={status !== 'processing' || updating} 
                        onClick={() => handleStatusChange('ready')} 
                      />
                      <ActionButton 
                        step={4} 
                        color="green" 
                        label="Mark as Claimed" 
                        desc="Document claimed (no notification sent)"
                        disabled={status !== 'ready' || updating} 
                        onClick={handleClaimClick} 
                      />
                    </>
                  )}
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400">or</span></div>
                  </div>
                  {/* 🆕 Reject button - disabled once approved/processing */}
                  <ActionButton 
                    step="✕" 
                    color="red" 
                    label="Reject Request" 
                    desc={isApprovedOrProcessing ? "Cannot reject after approval" : "Decline this request with reason"}
                    disabled={isRejectDisabled} 
                    onClick={handleRejectClick} 
                  />
                  {/* 🆕 Show warning message when reject is disabled due to approval */}
                  {isApprovedOrProcessing && status !== 'claimed' && status !== 'rejected' && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                      <FaInfoCircle className="text-amber-500 text-xs" />
                      <p className="text-xs text-amber-700">Reject is disabled because this request has already been approved/processed.</p>
                    </div>
                  )}
                </div>
              </div>
            )}


           

            {/* Activity History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FaHistory className="text-[#1B5E20]" /> Activity History</h2>
              </div>
              <div className="p-4">
                {request.history && request.history.length > 0 ? (
                  <div className="space-y-1">
                    {request.history.map((item, index) => (
                      <div key={index} className="relative pl-6 pb-4 last:pb-0">
                        {index !== request.history.length - 1 && (
                          <div className="absolute left-[11px] top-3 bottom-0 w-0.5 bg-gray-200"></div>
                        )}
                        <div className={`absolute left-0 top-2 w-2.5 h-2.5 rounded-full ${item.status === 'rejected' ? 'bg-red-500' : 'bg-[#1B5E20]'}`}></div>
                        <p className="text-sm font-medium text-gray-800">{item.action || item.status}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.timestamp ? new Date(item.timestamp).toLocaleString() : item.date}</p>
                        {item.reason && <p className="text-xs text-red-500 mt-0.5">Reason: {item.reason}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FaHistory className="text-gray-300 text-2xl mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No activity history yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} onConfirm={confirmStatusChange}
        title={selectedStatus === 'approved' ? 'Approve Request' : 'Mark as Ready for Pickup'}
        message={
          <div className="space-y-3">
            <p>{selectedStatus === 'approved' ? 'Approve this request and ask the requester to upload the Official Receipt?' : 'Mark this document as ready for pickup?'}</p>
            {!isRestricted && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs font-medium text-yellow-800 mb-2">📧 Notification will be sent to: {request.email}</p>
                <p className="text-xs text-gray-700 whitespace-pre-line">{emailMessage}</p>
              </div>
            )}
          </div>
        }
        confirmText={selectedStatus === 'approved' ? 'Yes, Approve Request' : 'Yes, Mark as Ready'}
        confirmColor={selectedStatus === 'approved' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
        loading={updating}
      />

      <ConfirmationModal
        isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} onConfirm={confirmClaim}
        title="Mark as Claimed"
        message={
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Mark <strong>{request.documentType}</strong> as <strong>CLAIMED</strong>?</p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">ℹ️ No email notification will be sent. This is for internal tracking only.</p>
            </div>
          </div>
        }
        confirmText="Yes, Mark as Claimed"
        confirmColor="bg-green-600 hover:bg-green-700"
        loading={updating}
      />

      <Modal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectReason(''); }}
        title="Reject Request"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
              className="trac-button-outline min-h-11 rounded-md px-4 py-2 text-sm font-medium"
              disabled={updating}
            >Cancel</button>
            <button
              type="button"
              onClick={confirmReject}
              className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={updating || !rejectReason.trim()}
            >{updating ? 'Processing...' : 'Reject Request'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Please provide a reason for rejecting this request.</p>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="e.g., Incomplete requirements, Invalid document request..."
            rows={4}
            className="min-h-28 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            autoFocus
            disabled={updating}
          />
          {rejectReason && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="whitespace-pre-line text-xs text-gray-700">
                {emailTemplates.rejected.replace('{REQ_ID}', request.id).replace('{DOCUMENT}', request.documentType).replace('{REASON}', rejectReason)}
              </p>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showOrImageModal}
        onClose={() => { setShowOrImageModal(false); setOrImagePreview(null); }}
        title={orImagePreview?.title || 'Official Receipt'}
        size="xl"
      >
        <img
          src={orImagePreview?.url || request.or_image_url}
          alt={orImagePreview?.title || 'Official receipt'}
          className="mx-auto max-h-[75vh] w-full object-contain"
        />
      </Modal>

      <Modal
        isOpen={showStudentPhotoModal}
        onClose={() => setShowStudentPhotoModal(false)}
        title={`${request.studentName || 'Student'} Profile Photo`}
        size="xl"
      >
        {studentPhotoPreviewFailed ? (
          <div className="flex justify-center">
            <StudentAvatar name={request.studentName} size="md" />
          </div>
        ) : (
          <img
            src={request.studentPhoto}
            alt={`${request.studentName || 'Student'} profile photo`}
            onError={() => setStudentPhotoPreviewFailed(true)}
            className="mx-auto max-h-[75vh] w-full object-contain"
          />
        )}
      </Modal>
    </div>
  );
};

// Helper Components
const InfoItem = ({ icon, label, value, isEmail, highlight }) => (
  <div className="flex items-start gap-3">
    <div className={`mt-0.5 ${highlight ? 'text-[#1B5E20]' : 'text-gray-400'}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-sm mt-0.5 ${highlight ? 'text-[#1B5E20] font-bold text-lg' : 'text-gray-800 font-medium'} ${isEmail ? 'text-blue-600' : ''}`}>
        {value || '—'}
      </p>
    </div>
  </div>
);

const ActionButton = ({ step, color, label, desc, disabled, onClick }) => {
  const colors = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    purple: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
    green: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
  };
  const bgColors = { blue: 'bg-blue-600', purple: 'bg-purple-600', green: 'bg-green-600', red: 'bg-red-600' };

  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center px-4 py-3 rounded-xl text-sm transition border ${disabled ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' : colors[color]}`}>
      <span className={`w-7 h-7 ${bgColors[color]} rounded-full flex items-center justify-center mr-3 text-white text-xs font-bold flex-shrink-0 ${disabled ? 'opacity-50' : ''}`}>
        {step}
      </span>
      <div className="flex-1 text-left">
        <p className="font-semibold">{label}</p>
        <p className="text-xs opacity-70">{desc}</p>
      </div>
    </button>
  );
};

export default RequestDetails;