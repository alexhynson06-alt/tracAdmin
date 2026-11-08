import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaFileAlt, 
  FaHistory, 
  FaCog, 
  FaUsersCog,
  FaSignOutAlt
  ,FaUserCircle
} from 'react-icons/fa';
import { adminSupabase, clearAdminSessionCache } from '../services/adminAuth';

const AdminSidebar = ({ isOpen, closeSidebar, toggleSidebar }) => {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [userInfo, setUserInfo] = useState({
    name: 'Admin User',
    email: 'admin@trac.edu.ph',
    initials: 'AD',
    role: 'staff'
    ,avatar_url: ''
  });
  
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const activeElement = document.activeElement;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      (activeElement || menuButtonRef.current)?.focus?.();
    };
  }, [closeSidebar, isOpen]);

  useEffect(() => {
    const loadUserInfo = () => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const user = parsed.user || parsed;
        
        let displayName = 'Admin User';
        if (user.name) {
          displayName = user.name;
        } else if (user.firstName && user.lastName) {
          displayName = `${user.firstName} ${user.lastName}`;
        } else if (user.first_name && user.last_name) {
          displayName = `${user.first_name} ${user.last_name}`;
        }
        
        const email = user.email || 'admin@trac.edu.ph';
        const role = user.role || 'staff';
        
        const initials = displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        
        setUserInfo({
          name: displayName,
          email: email,
          initials: initials,
          role: role
          ,avatar_url: user.avatar_url || ''
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    };

    loadUserInfo();
    window.addEventListener('auth-changed', loadUserInfo);
    return () => window.removeEventListener('auth-changed', loadUserInfo);
  }, []);

  const fetchPendingCount = useCallback(async () => {
    setIsLoadingCount(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/requests/pending-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    } finally {
      setIsLoadingCount(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  const baseNavItems = [
    { path: '/admin/dashboard', icon: <FaTachometerAlt className="w-5 h-5" />, label: 'Dashboard', description: 'Overview & analytics' },
    { path: '/admin/requests', icon: <FaFileAlt className="w-5 h-5" />, label: 'Requests', description: 'Manage document requests' },
    { path: '/admin/activity-logs', icon: <FaHistory className="w-5 h-5" />, label: 'Activity Logs', description: 'Track admin actions' },
    { path: '/admin/settings', icon: <FaCog className="w-5 h-5" />, label: 'Settings', description: 'System configuration' },
  ];

  const adminUsersItem = { path: '/admin/users', icon: <FaUsersCog className="w-5 h-5" />, label: 'Admin Users', description: 'Manage staff accounts' };

  const navItems = userInfo.role === 'super_admin' 
    ? [...baseNavItems, adminUsersItem]
    : baseNavItems;

  const handleLogout = async () => {
    await adminSupabase?.auth.signOut();
    clearAdminSessionCache();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        ref={drawerRef}
        tabIndex={isOpen ? -1 : undefined}
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-label="Admin navigation"
        aria-hidden={!isOpen && !window.matchMedia('(min-width: 1024px)').matches ? 'true' : undefined}
        className={`
          fixed inset-y-0 left-0 z-50 flex h-screen w-[min(18rem,calc(100vw-2rem))] max-w-full flex-col overflow-hidden bg-gradient-to-b from-white via-white to-[#F1F8E9]
          shadow-2xl transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:w-72 lg:shadow-xl
        `}
      >
        {/* Brand */}
        <div className="relative border-b border-gray-100 p-5 hover:bg-[#F1F8E9]/70 transition">
          <Link to="/admin/dashboard" onClick={closeSidebar} className="block">
            <div className="flex min-w-0 items-center gap-3 pr-8">
              <img
                src="/TracLogo.png"
                alt="TRAC logo"
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/TracLogo.png';
                }}
              />
              <div className="min-w-0 flex-1">
                <h1 className="whitespace-nowrap text-[17px] font-bold leading-tight">
                  <span className="text-[#1B5E20]">TRAC </span>
                  <span className="text-[#F9A825]">REQUEST</span>
                </h1>
                <p className="mt-1 whitespace-normal text-[10px] font-medium uppercase leading-4 text-[#33691E]">
                  Online Request and Tracking<br />with Email Notifications
                </p>
              </div>
            </div>
          </Link>
          
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // 🆕 Iwasan ang Link navigation kapag close button ang na-click
              e.stopPropagation();
              closeSidebar();
            }}
            aria-label="Close navigation menu"
            className="trac-button-outline absolute right-3 top-4 flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1 text-gray-400 transition lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User profile */}
        <div className="m-4 p-3 bg-gradient-to-r from-[#1B5E20]/5 via-white to-[#F9A825]/10 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1B5E20] to-[#F9A825] rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                {userInfo.avatar_url ? <img src={userInfo.avatar_url} alt="Admin profile" className="h-full w-full object-cover" /> : <span className="text-white font-bold text-base">{userInfo.initials}</span>}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{userInfo.name}</p>
              <p className="text-xs text-gray-500 truncate">{userInfo.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${userInfo.role === 'super_admin' ? 'bg-red-500' : 'bg-[#F9A825]'}`}></div>
                <span className={`text-[10px] font-semibold ${
                  userInfo.role === 'super_admin' ? 'text-red-600' : 'text-[#33691E]'
                }`}>
                  {userInfo.role === 'super_admin' ? 'Registrar' : 'Admin Staff'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="space-y-1">
            {userInfo.role !== 'super_admin' && (
              <NavLink
                to="/admin/profile"
                onClick={closeSidebar}
                className={({ isActive }) => `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-[#1B5E20]/10 to-[#F9A825]/10 text-[#1B5E20] shadow-sm' : 'text-gray-600 hover:text-[#1B5E20] hover:bg-gray-50'}`}
              >
                {userInfo.avatar_url ? (
                  <img src={userInfo.avatar_url} alt="Admin profile" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <FaUserCircle className="w-5 h-5 text-gray-400 group-hover:text-[#1B5E20]" />
                )}
                <span>My Profile</span>
              </NavLink>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) => `
                  group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-[#1B5E20]/10 to-[#F9A825]/10 text-[#1B5E20] shadow-sm'
                    : 'text-gray-600 hover:text-[#1B5E20] hover:bg-gray-50'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#1B5E20] to-[#F9A825] rounded-full"></div>
                    )}
                    
                    <span className={`transition-all duration-200 group-hover:scale-110 ${isActive ? 'text-[#1B5E20]' : 'text-gray-400 group-hover:text-[#1B5E20]'}`}>
                      {item.icon}
                    </span>
                    
                    <div className="flex-1">
                      <span className="block">{item.label}</span>
                    </div>
                    
                    {item.label === 'Requests' && pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                        {pendingCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ========== FOOTER ========== */}
        <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <button
            onClick={handleLogout}
            className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50"
          >
            <FaSignOutAlt className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 group-hover:translate-x-0.5" />
            <span>Sign Out</span>
          </button>
          
         
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;