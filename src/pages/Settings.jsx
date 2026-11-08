import React, { useState, useEffect } from 'react';
import { 
  FaSave, 
  FaSpinner, 
  FaEnvelope,
  FaClock,
  FaChartLine,
  FaFileAlt,
  FaBell,
  FaSlidersH,
  FaPlus,
  FaUserGraduate,
  FaUserTie,
  FaPowerOff,
  FaTrash,
  FaUndo
} from 'react-icons/fa';
import { ConfirmationModal } from '../components/Modal';

const DEFAULT_DOCUMENT_SETTINGS = [
  { id: 1, name: 'Certificate of Registration (COR)', fee: 20, feeUnit: 'per_copy', category: 'Document', allowedRoles: ['student'], active: true },
  { id: 2, name: 'Certificate of Grades (COG)', fee: 20, feeUnit: 'per_copy', category: 'Document', allowedRoles: ['student'], active: true },
  { id: 3, name: 'Transcript of Records (TOR)', fee: 100, feeUnit: 'per_page', category: 'Document', allowedRoles: ['alumni'], active: true },
  { id: 4, name: 'General Weighted Average (GWA)', fee: 70, feeUnit: 'per_copy', category: 'Document', allowedRoles: ['alumni'], active: true },
  { id: 5, name: 'Certificate of Authentication and Verification (CAV)', fee: 50, feeUnit: 'per_copy', category: 'Document', allowedRoles: ['alumni'], active: true },
  { id: 6, name: 'Diploma', fee: 0, feeUnit: 'per_copy', category: 'Document', allowedRoles: ['alumni'], active: true },
  { id: 7, name: 'INC Form', fee: 15, feeUnit: 'per_subject', category: 'Form', allowedRoles: ['student'], active: true },
  { id: 8, name: 'Shifting Form', fee: 0, feeUnit: 'per_copy', category: 'Form', allowedRoles: ['student'], active: true }
];

const REQUEST_CATEGORIES = ['Document', 'Form'];
const FEE_UNITS = [
  { value: 'per_copy', label: 'per copy' },
  { value: 'per_page', label: 'per page' },
  { value: 'per_subject', label: 'per subject' }
];
const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
].map((label, index) => ({ value: index + 1, label }));
const DEFAULT_ACTIVITY_CALENDAR = {
  schoolYearStartMonth: 8,
  semesters: {
    first: { startMonth: 8, endMonth: 12 },
    second: { startMonth: 1, endMonth: 5 },
    summer: { startMonth: 6, endMonth: 7 }
  }
};
const DEFAULT_INSTITUTES = [
  { code: 'ICS', name: 'Institute of Computing Studies', shortName: 'ICS', programs: [
    { code: 'BSIT', name: 'Bachelor of Science in Information Technology', abbr: 'BSIT' },
    { code: 'BSIS', name: 'Bachelor of Science in Information Systems', abbr: 'BSIS' }
  ] },
  { code: 'ISCJS', name: 'Institute of Social and Criminal Justice Studies', shortName: 'ISCJS', programs: [
    { code: 'BSCRIM', name: 'Bachelor of Science in Criminology', abbr: 'BSCRIM' }
  ] },
  { code: 'IVTES', name: 'Institute of Vocational and Technical Education Studies', shortName: 'IVTES', programs: [
    { code: 'BTVTED', name: 'Bachelor of Technical-Vocational Teacher Education', abbr: 'BTVTED' },
    { code: 'BTLED', name: 'Bachelor of Technology and Livelihood Education', abbr: 'BTLED' },
    { code: 'BSHM', name: 'Bachelor of Science in Hospitality Management', abbr: 'BSHM' },
    { code: 'BSHRRM', name: 'Bachelor of Science in Hotel and Restaurant Resource Management', abbr: 'BSHRRM' },
    { code: 'BSHT', name: 'Bachelor of Science in Hospitality and Tourism', abbr: 'BSHT' }
  ] },
  { code: 'IAS', name: 'Institute of Agricultural Sciences', shortName: 'IAS', programs: [
    { code: 'BSA', name: 'Bachelor of Science in Agriculture', abbr: 'BSA' },
    { code: 'BSF', name: 'Bachelor of Science in Forestry', abbr: 'BSF' },
    { code: 'BSAB', name: 'Bachelor of Science in Agribusiness', abbr: 'BSAB' }
  ] },
  { code: 'GS', name: 'Graduate Studies', shortName: 'GS', programs: [
    { code: 'MAEd', name: 'Master of Arts in Education', abbr: 'MAEd' },
    { code: 'MSA', name: 'Master of Science in Agriculture', abbr: 'MSA' },
    { code: 'MSAgEd', name: 'Master of Science in Agricultural Education', abbr: 'MSAgEd' },
    { code: 'MSAg.Mgt.', name: 'Master of Science in Agricultural Management', abbr: 'MSAg.Mgt.' }
  ] }
];

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const [settings, setSettings] = useState({
    contactEmail: '',
    officeHours: '',
    dailyQueueLimit: 100,
    maxCopiesPerRequest: 5,
    requirePurpose: true,
    emailNotifications: {
      onNewRequest: true,
      onStatusChange: true,
      onCompletion: true
    },
    documentSettings: DEFAULT_DOCUMENT_SETTINGS,
    academicSettings: DEFAULT_INSTITUTES,
    activityCalendar: DEFAULT_ACTIVITY_CALENDAR
  });

  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [newDoc, setNewDoc] = useState({
    name: '', fee: 0, feeUnit: 'per_copy', category: 'Document',
    allowedRoles: ['student', 'alumni']
  });
  const [newInstitute, setNewInstitute] = useState({ code: '', name: '' });
  const [newCourses, setNewCourses] = useState({});
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removePending, setRemovePending] = useState(false);
  const [showArchivedDocuments, setShowArchivedDocuments] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      
      setSettings({
        contactEmail: data.settings.contact_email || '',
        officeHours: data.settings.office_hours || '',
        dailyQueueLimit: data.settings.daily_queue_limit || 100,
        maxCopiesPerRequest: data.settings.max_copies_per_request || 5,
        requirePurpose: data.settings.require_purpose !== undefined ? data.settings.require_purpose : true,
        emailNotifications: data.settings.email_notifications || {
          onNewRequest: true, onStatusChange: true, onCompletion: true
        },
        documentSettings: (data.settings.document_settings && data.settings.document_settings.length > 0) 
          ? data.settings.document_settings : DEFAULT_DOCUMENT_SETTINGS,
        academicSettings: Array.isArray(data.settings.academic_settings) && data.settings.academic_settings.length > 0
          ? data.settings.academic_settings : DEFAULT_INSTITUTES,
        activityCalendar: data.settings.activity_calendar || DEFAULT_ACTIVITY_CALENDAR
      });
    } catch (err) { showToast('Failed to load settings', 'error'); } 
    finally { setIsLoading(false); }
  };

  const handleInputChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleAddInstitute = () => {
    const code = newInstitute.code.trim().toUpperCase();
    const name = newInstitute.name.trim();
    if (!/^[A-Z0-9-]{2,12}$/.test(code) || !name) {
      showToast('Enter a valid institute code and full name.', 'error');
      return;
    }
    if (settings.academicSettings.some(institute => institute.code.toUpperCase() === code)) {
      showToast('That institute code already exists.', 'error');
      return;
    }
    setSettings(prev => ({
      ...prev,
      academicSettings: [...prev.academicSettings, { code, name, programs: [] }]
    }));
    setNewInstitute({ code: '', name: '' });
    showToast(`${code} added. Add at least one course, then save settings.`, 'success');
  };

  const handleAddCourse = (instituteCode) => {
    const draft = newCourses[instituteCode] || {};
    const code = String(draft.code || '').trim().toUpperCase();
    const name = String(draft.name || '').trim();
    if (!/^[A-Z0-9.-]{2,20}$/.test(code) || !name) {
      showToast('Enter a valid course code and name.', 'error');
      return;
    }
    const allPrograms = settings.academicSettings.flatMap(institute => institute.programs);
    if (allPrograms.some(program => program.code.toUpperCase() === code || program.name.toLowerCase() === name.toLowerCase())) {
      showToast('That course code or name already exists.', 'error');
      return;
    }
    setSettings(prev => ({
      ...prev,
      academicSettings: prev.academicSettings.map(institute => institute.code === instituteCode
        ? { ...institute, programs: [...institute.programs, { code, name }] }
        : institute)
    }));
    setNewCourses(prev => ({ ...prev, [instituteCode]: { code: '', name: '' } }));
    showToast(`${code} added under ${instituteCode}. Save Changes to publish.`, 'success');
  };

  const handleDeleteInstitute = (institute) => {
    if (settings.academicSettings.length <= 1) {
      showToast('At least one institute must remain in the catalog.', 'error');
      return;
    }
    setRemoveTarget({ type: 'institute', institute });
  };

  const handleDeleteCourse = (institute, program) => {
    if (institute.programs.length <= 1) {
      showToast('Each institute must keep at least one course. Remove the institute instead.', 'error');
      return;
    }
    setRemoveTarget({ type: 'course', institute, program });
  };

  const saveSettingsPayload = async (payload) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to save settings');
  };

  const confirmRemoval = async () => {
    if (!removeTarget) return;
    setRemovePending(true);
    const { type, institute, program } = removeTarget;
    if (type === 'document') {
      setSettings(prev => ({
        ...prev,
        documentSettings: prev.documentSettings.map(item => item.id === removeTarget.document.id
          ? { ...item, archived: true }
          : item)
      }));
      showToast(`"${removeTarget.document.name}" archived in the draft. Save Changes to apply.`, 'info');
    } else if (type === 'institute') {
      const nextSettings = {
        ...settings,
        academicSettings: settings.academicSettings.filter(item => item.code !== institute.code)
      };
      try {
        await saveSettingsPayload(nextSettings);
        setSettings(nextSettings);
        setNewCourses(prev => {
          const next = { ...prev };
          delete next[institute.code];
          return next;
        });
        showToast(`${institute.code} removed.`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    } else {
      setSettings(prev => ({
        ...prev,
        academicSettings: prev.academicSettings.map(item => item.code === institute.code
          ? { ...item, programs: item.programs.filter(course => course.code !== program.code) }
          : item)
      }));
      showToast(`${program.code} removed from the draft. Save Changes to publish.`, 'info');
    }
    setRemoveTarget(null);
    setRemovePending(false);
  };
  
  const handleEmailNotifChange = (key, checked) => {
    setSettings(prev => ({ ...prev, emailNotifications: { ...prev.emailNotifications, [key]: checked } }));
  };

  const handleDocumentSettingChange = (id, field, value) => {
    setSettings(prev => ({
      ...prev,
      documentSettings: prev.documentSettings.map(doc => doc.id === id ? { ...doc, [field]: value } : doc)
    }));
  };

  // 🆕 ROLE TOGGLE — GAMIT ANG CHECKBOX LOGIC
  const handleRoleToggle = (id, role) => {
    setSettings(prev => ({
      ...prev,
      documentSettings: prev.documentSettings.map(doc => {
        if (doc.id !== id) return doc;
        const currentRoles = doc.allowedRoles || [];
        if (currentRoles.includes(role)) {
          return { ...doc, allowedRoles: currentRoles.filter(r => r !== role) };
        } else {
          return { ...doc, allowedRoles: [...currentRoles, role] };
        }
      })
    }));
  };

  const handleDeleteClick = (doc) => {
    handleDocumentSettingChange(doc.id, 'active', doc.active === false);
    showToast(`"${doc.name}" ${doc.active === false ? 'activated' : 'deactivated'}. Save Changes to apply.`, 'info');
  };

  const handleArchiveClick = (doc) => setRemoveTarget({ type: 'document', document: doc });

  const handleRestoreDocument = (doc) => {
    handleDocumentSettingChange(doc.id, 'archived', false);
    showToast(`"${doc.name}" restored in the draft. Save Changes to apply.`, 'info');
  };

  const handleSemesterMonthChange = (semester, edge, value) => {
    setSettings(prev => ({
      ...prev,
      activityCalendar: {
        ...prev.activityCalendar,
        semesters: {
          ...prev.activityCalendar.semesters,
          [semester]: {
            ...prev.activityCalendar.semesters[semester],
            [edge]: Number(value)
          }
        }
      }
    }));
  };
  
  const handleAddDocument = () => {
    if (!newDoc.name.trim()) { showToast('Document name is required', 'error'); return; }
    if (!newDoc.allowedRoles.length) { showToast('Select Student, Alumni, or both.', 'error'); return; }
    if (settings.documentSettings.some(doc => doc.name.trim().toLowerCase() === newDoc.name.trim().toLowerCase())) {
      showToast('A document or form with this name already exists.', 'error'); return;
    }
    if (!Number.isFinite(Number(newDoc.fee)) || Number(newDoc.fee) < 0) {
      showToast('Enter a valid fee.', 'error'); return;
    }
    const newDocument = {
      id: `catalog-${Date.now()}-${Math.floor(Math.random() * 100000)}`, name: newDoc.name.trim(), fee: Number(newDoc.fee), feeUnit: newDoc.feeUnit,
      category: newDoc.category, archived: false,
      allowedRoles: newDoc.allowedRoles, active: true
    };
    setSettings(prev => ({ ...prev, documentSettings: [...prev.documentSettings, newDocument] }));
    setNewDoc({
      name: '', fee: 0, feeUnit: 'per_copy', category: 'Document',
      allowedRoles: ['student', 'alumni']
    });
    setShowAddDocForm(false);
    showToast('Document added! Click Save Changes to apply.', 'success');
  };

  // 🆕 NEW DOC ROLE TOGGLE — GAMIT ANG CHECKBOX LOGIC
  const handleNewDocRoleToggle = (role) => {
    setNewDoc(prev => {
      const currentRoles = prev.allowedRoles;
      if (currentRoles.includes(role)) return { ...prev, allowedRoles: currentRoles.filter(r => r !== role) };
      else return { ...prev, allowedRoles: [...currentRoles, role] };
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveSettingsPayload(settings);
      showToast('Settings saved successfully!', 'success');
    } catch (err) { showToast(err.message, 'error'); } 
    finally { setIsSaving(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1B5E20] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Toast */}
        {toast.show && (
          <div className={`fixed top-20 right-6 z-50 px-4 py-2 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white text-sm`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-r from-[#1B5E20] to-[#F9A825] rounded-xl flex items-center justify-center shadow-sm">
              <FaSlidersH className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#1B5E20] to-[#F9A825] bg-clip-text text-transparent tracking-tight">System Settings</h1>
              <p className="text-xs text-gray-500">Configure all system preferences</p>
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={isSaving}
            className="trac-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            {isSaving ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaSave className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="space-y-6">
          
          {/* General Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaEnvelope className="text-[#1B5E20] text-sm" />
              <h2 className="text-sm font-semibold text-gray-800">General</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input type="email" value={settings.contactEmail} onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none" placeholder="registrar@trac.edu.ph" />
                <p className="text-xs text-gray-400 mt-1">Primary email for inquiries</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Hours</label>
                <input type="text" value={settings.officeHours} onChange={(e) => handleInputChange('officeHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none" placeholder="Mon-Fri, 8:00 AM - 5:00 PM" />
                <p className="text-xs text-gray-400 mt-1">Displayed on student dashboard</p>
              </div>
            </div>
          </div>

          {/* Institute and Course Catalog */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex flex-col gap-1 mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Institutes & Courses</h2>
              <p className="text-xs text-gray-500">These options appear in Student and Alumni signup. Existing institute codes stay unchanged.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr_auto] gap-3 mb-5">
              <input
                type="text"
                value={newInstitute.code}
                onChange={(e) => setNewInstitute(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Institute code"
                maxLength={12}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none"
              />
              <input
                type="text"
                value={newInstitute.name}
                onChange={(e) => setNewInstitute(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full institute name"
                maxLength={120}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none"
              />
              <button type="button" onClick={handleAddInstitute}
                className="px-3 py-2 bg-[#1B5E20] text-white text-sm font-medium rounded-lg hover:bg-[#154d19] transition flex items-center justify-center gap-2">
                <FaPlus className="w-3 h-3" /> Add Institute
              </button>
            </div>

            <div className="space-y-4">
              {settings.academicSettings.map(institute => {
                const courseDraft = newCourses[institute.code] || { code: '', name: '' };
                return (
                  <section key={institute.code} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-xs font-bold text-[#1B5E20]">{institute.code}</span>
                        <h3 className="text-sm font-semibold text-gray-800">{institute.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteInstitute(institute)}
                        aria-label={`Remove ${institute.code} institute`}
                        title="Remove institute and its courses"
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <FaTrash aria-hidden="true" /> Remove Institute
                      </button>
                    </div>
                    {institute.programs.length > 0 ? (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mb-3">
                        {institute.programs.map(program => (
                          <li key={program.code} className="flex min-w-0 items-center gap-2 py-1 text-xs">
                            <span className="shrink-0 font-medium text-gray-700">{program.code}</span>
                            <span className="min-w-0 flex-1 text-gray-500">{program.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(institute, program)}
                              aria-label={`Remove ${program.code} course from ${institute.code}`}
                              title="Remove course"
                              className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md px-2 text-red-600 transition hover:bg-red-50"
                            >
                              <FaTrash aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-3 text-xs text-amber-700">Add at least one course before saving this institute.</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_auto] gap-2">
                      <input
                        type="text"
                        value={courseDraft.code}
                        onChange={(e) => setNewCourses(prev => ({ ...prev, [institute.code]: { ...courseDraft, code: e.target.value.toUpperCase() } }))}
                        placeholder="Course code"
                        maxLength={20}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1B5E20] outline-none"
                      />
                      <input
                        type="text"
                        value={courseDraft.name}
                        onChange={(e) => setNewCourses(prev => ({ ...prev, [institute.code]: { ...courseDraft, name: e.target.value } }))}
                        placeholder="Full course name"
                        maxLength={160}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1B5E20] outline-none"
                      />
                      <button type="button" onClick={() => handleAddCourse(institute.code)}
                        className="px-3 py-2 border border-[#1B5E20] text-[#1B5E20] text-xs font-medium rounded-lg hover:bg-[#F1F8E9] transition flex items-center justify-center gap-1.5">
                        <FaPlus className="w-2.5 h-2.5" /> Add Course
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* Queue Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaChartLine className="text-[#1B5E20] text-sm" />
              <h2 className="text-sm font-semibold text-gray-800">Queue</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Daily Request Limit</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="500" value={settings.dailyQueueLimit} onChange={(e) => handleInputChange('dailyQueueLimit', parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none" />
                  <span className="text-gray-500 text-sm">requests/day</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Maximum requests accepted across the system per day</p>
              </div>
            </div>
          </div>

          {/* Academic Calendar Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FaClock className="text-[#1B5E20] text-sm" />
                  <h2 className="text-sm font-semibold text-gray-800">Academic Calendar</h2>
                </div>
                <p className="mt-1 text-xs text-gray-500">School year runs August through July. Choose the months used for each semester.</p>
              </div>
              <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-800">School year starts August</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { key: 'first', label: 'First Semester' },
                { key: 'second', label: 'Second Semester' },
                { key: 'summer', label: 'Summer' }
              ].map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <h3 className="mb-3 text-sm font-semibold text-gray-800">{label}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['startMonth', 'endMonth'].map((edge) => (
                      <label key={edge} className="block text-xs text-gray-600">
                        {edge === 'startMonth' ? 'From' : 'Through'}
                        <select
                          value={settings.activityCalendar.semesters[key][edge]}
                          onChange={(event) => handleSemesterMonthChange(key, edge, event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm text-gray-800 focus:border-[#1B5E20] focus:outline-none focus:ring-1 focus:ring-[#1B5E20]"
                        >
                          {MONTH_OPTIONS.map(month => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaFileAlt className="text-[#1B5E20] text-sm" />
              <h2 className="text-sm font-semibold text-gray-800">Documents</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Copies per Request</label>
                <input type="number" min="1" max="10" value={settings.maxCopiesPerRequest} onChange={(e) => handleInputChange('maxCopiesPerRequest', parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none" />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.requirePurpose} onChange={(e) => handleInputChange('requirePurpose', e.target.checked)}
                    className="w-4 h-4 text-[#1B5E20] border-gray-300 rounded focus:ring-[#1B5E20]" />
                  <span className="ml-2 text-sm text-gray-700">Require purpose for requests</span>
                </label>
              </div>
            </div>

            {/* Add Document Button */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Document Fees</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchivedDocuments(value => !value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  {showArchivedDocuments ? 'Show active' : `Archived (${settings.documentSettings.filter(doc => doc.archived).length})`}
                </button>
                {!showArchivedDocuments && (
                  <button onClick={() => setShowAddDocForm(!showAddDocForm)}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-xs font-medium rounded-lg hover:opacity-90 transition flex items-center gap-1 shadow-sm">
                    <FaPlus className="w-3 h-3" /> Add Document
                  </button>
                )}
              </div>
            </div>

            {/* Add New Document Form */}
            {showAddDocForm && (
              <div className="mb-4 p-4 bg-gradient-to-r from-[#1B5E20]/5 to-[#F9A825]/10 border border-[#1B5E20]/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-3">Add New Document/Form</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <input type="text" placeholder="Document Name" value={newDoc.name} onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none" />
                  <select value={newDoc.category} onChange={(e) => setNewDoc({...newDoc, category: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none">
                    {REQUEST_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-xs font-bold">₱</span>
                    <input type="number" min="0" step="0.01" value={newDoc.fee} onChange={(e) => setNewDoc({...newDoc, fee: e.target.value})}
                      className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none" />
                  </div>
                </div>
                <div className="mb-3">
                  <select value={newDoc.feeUnit} onChange={(e) => setNewDoc({...newDoc, feeUnit: e.target.value})}
                    className="w-full sm:w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none">
                    {FEE_UNITS.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-xs text-gray-600">For:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={newDoc.allowedRoles.includes('student')} onChange={() => handleNewDocRoleToggle('student')}
                      className="w-4 h-4 rounded accent-[#285ccc]" />
                    <FaUserGraduate className="text-[#285ccc] text-sm" />
                    <span className="text-xs text-gray-700">Student</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={newDoc.allowedRoles.includes('alumni')} onChange={() => handleNewDocRoleToggle('alumni')}
                      className="w-4 h-4 rounded accent-[#780115]" />
                    <FaUserTie className="text-[#780115] text-sm" />
                    <span className="text-xs text-gray-700">Alumni</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddDocument} className="trac-button rounded-lg px-4 py-2 text-xs font-medium">Add</button>
                  <button onClick={() => setShowAddDocForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition">Cancel</button>
                </div>
              </div>
            )}

            {/* Document Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Document Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fee (₱)</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fee Unit</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Student/Alumni</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.documentSettings.filter(doc => showArchivedDocuments ? doc.archived : !doc.archived).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                        {showArchivedDocuments ? 'No archived document types.' : 'No active document types.'}
                      </td>
                    </tr>
                  )}
                  {settings.documentSettings.filter(doc => showArchivedDocuments ? doc.archived : !doc.archived).map((doc) => (
                    <tr key={doc.id} className={`border-b border-gray-50 hover:bg-gray-50 ${doc.archived ? 'bg-gray-50/70' : ''}`}>
                      <td className="px-3 py-2">
                        <input type="text" value={doc.name} onChange={(e) => handleDocumentSettingChange(doc.id, 'name', e.target.value)} disabled={doc.archived}
                          className="w-full px-2 py-1 border border-transparent hover:border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none bg-transparent" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={doc.category || (doc.name.includes('Form') ? 'Form' : 'Document')}
                          onChange={(e) => handleDocumentSettingChange(doc.id, 'category', e.target.value)} disabled={doc.archived}
                          className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none">
                          {REQUEST_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 text-xs font-bold">₱</span>
                          <input type="number" min="0" step="0.01" value={doc.fee} onChange={(e) => handleDocumentSettingChange(doc.id, 'fee', parseFloat(e.target.value))} disabled={doc.archived}
                            className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select value={doc.feeUnit || 'per_copy'} onChange={(e) => handleDocumentSettingChange(doc.id, 'feeUnit', e.target.value)} disabled={doc.archived}
                          className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#1B5E20] outline-none">
                          {FEE_UNITS.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                        </select>
                      </td>
                      {/* 🆕 CHECKBOX COLUMN */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-3">
                          <label className="flex items-center gap-1 cursor-pointer" title="Student">
                            <input type="checkbox" checked={(doc.allowedRoles || []).includes('student')} onChange={() => handleRoleToggle(doc.id, 'student')} disabled={doc.archived}
                              className="w-4 h-4 rounded accent-[#285ccc]" />
                            <FaUserGraduate className="text-[#285ccc] text-xs" />
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer" title="Alumni">
                            <input type="checkbox" checked={(doc.allowedRoles || []).includes('alumni')} onChange={() => handleRoleToggle(doc.id, 'alumni')} disabled={doc.archived}
                              className="w-4 h-4 rounded accent-[#780115]" />
                            <FaUserTie className="text-[#780115] text-xs" />
                          </label>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${doc.active === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                          {doc.archived ? 'Archived' : doc.active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!doc.archived && (
                            <button type="button" onClick={() => handleDeleteClick(doc)}
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#1B5E20]"
                              title={doc.active === false ? 'Activate request type' : 'Deactivate request type'}
                              aria-label={doc.active === false ? `Activate ${doc.name}` : `Deactivate ${doc.name}`}>
                              <FaPowerOff className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {doc.archived ? (
                            <button type="button" onClick={() => handleRestoreDocument(doc)}
                              className="rounded-lg p-1.5 text-[#1B5E20] transition hover:bg-green-50"
                              title="Restore document type" aria-label={`Restore ${doc.name}`}>
                              <FaUndo className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button type="button" onClick={() => handleArchiveClick(doc)}
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Delete (archive) document type" aria-label={`Delete ${doc.name}`}>
                              <FaTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaBell className="text-[#1B5E20] text-sm" />
              <h2 className="text-sm font-semibold text-gray-800">Notifications</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: 'onNewRequest', title: 'New Request Submitted', desc: 'Email when student submits a request' },
                { key: 'onStatusChange', title: 'Status Change', desc: 'Email when request status is updated' },
                { key: 'onCompletion', title: 'Request Ready for Pickup', desc: 'Email when document is ready to claim' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.emailNotifications?.[item.key] || false} onChange={(e) => handleEmailNotifChange(item.key, e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B5E20]"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!removeTarget}
        onClose={() => !removePending && setRemoveTarget(null)}
        onConfirm={confirmRemoval}
        title={removeTarget?.type === 'document' ? 'Delete Document Fee?' : removeTarget?.type === 'institute' ? 'Remove Institute?' : 'Remove Course?'}
        message={removeTarget?.type === 'document'
          ? `Archive ${removeTarget.document.name}? It will be removed from student request choices while its fee details remain available for historical requests. You can restore it later from the archived list.`
          : removeTarget?.type === 'institute'
            ? `Are you sure you want to remove ${removeTarget.institute.code} - ${removeTarget.institute.name} and all its courses from signup options? This saves your current settings right away. Institutes that still have registered users cannot be removed.`
            : `Are you sure you want to remove ${removeTarget?.program.code} - ${removeTarget?.program.name} from ${removeTarget?.institute.code} signup options? Existing user profiles will not be changed.`}
        confirmText={removeTarget?.type === 'document' ? 'Yes, Archive' : removeTarget?.type === 'institute' ? 'Yes, Remove Institute' : 'Yes, Remove Course'}
        cancelText="Cancel"
        loading={removePending}
      />
    </div>
  );
};

export default Settings;