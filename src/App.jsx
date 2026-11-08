import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminRoutes from './routes/AdminRoutes';
import Login from './pages/Login';
import { adminSupabase, clearAdminSessionCache } from './services/adminAuth';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncSession = (session) => {
      if (session?.access_token) {
        localStorage.setItem('authToken', session.access_token);
        setIsAuth(true);
      } else {
        clearAdminSessionCache();
        setIsAuth(false);
      }
      setLoading(false);
    };

    if (!adminSupabase) {
      clearAdminSessionCache();
      setLoading(false);
      return undefined;
    }

    adminSupabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        clearAdminSessionCache();
        setIsAuth(false);
        setLoading(false);
        return;
      }

      if (!data.session?.access_token) {
        syncSession(null);
        return;
      }

      localStorage.setItem('authToken', data.session.access_token);
      fetch(`${import.meta.env.VITE_API_URL}/admin/me`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      })
        .then(async (response) => {
          const profile = await response.json();
          if (!response.ok) throw new Error(profile.message || 'Admin profile is unavailable');
          localStorage.setItem('currentUser', JSON.stringify(profile));
          syncSession(data.session);
        })
        .catch(() => {
          void adminSupabase.auth.signOut();
          clearAdminSessionCache();
          setIsAuth(false);
          setLoading(false);
        });
    });

    const { data: { subscription } } = adminSupabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F8E9]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B5E20]"></div>
      </div>
    );
  }

  return (
    <BrowserRouter
      basename="/"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={
          isAuth ? <AdminRoutes /> : <Navigate to="/login" replace />
        } />
        <Route path="/" element={
          isAuth ? <Navigate to="/admin/dashboard" /> : <Navigate to="/login" />
        } />
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-[#F1F8E9]">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-[#1B5E20] mb-4">404</h1>
              <p className="text-gray-600 mb-6">Page not found</p>
              <a href="/admin/dashboard" className="trac-button inline-block rounded-xl px-6 py-2">
                Go to Dashboard
              </a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
