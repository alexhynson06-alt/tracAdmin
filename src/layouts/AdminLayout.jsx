import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminNotifications from '../components/AdminNotifications';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen overflow-hidden bg-[#F1F8E9] text-slate-900">
      <AdminSidebar
        isOpen={isSidebarOpen}
        closeSidebar={closeSidebar}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-72">
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="flex min-h-16 items-center justify-between px-3 sm:px-5 lg:justify-end lg:px-8">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
              className="trac-button-outline flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 transition lg:hidden"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <AdminNotifications />
          </div>
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-gray-200 bg-white px-4 py-3 text-center sm:px-6">
          <p className="text-xs text-gray-500">© 2026 TRAC Registrar System</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;