import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProfileAccount from './pages/ProfileAccount';
import ProfileRatings from './pages/ProfileRatings';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [didTriggerAuthRedirect, setDidTriggerAuthRedirect] = useState(false);
  const [authRedirectBlocked, setAuthRedirectBlocked] = useState(false);

  useEffect(() => {
    if (authError?.type === 'auth_required' && !didTriggerAuthRedirect) {
      const key = 'habal_auth_redirect_guard';
      const now = Date.now();
      const raw = sessionStorage.getItem(key);
      const meta = raw ? JSON.parse(raw) : { count: 0, lastTs: 0 };
      const withinWindow = now - (meta.lastTs || 0) < 15000;
      const nextCount = withinWindow ? (meta.count || 0) + 1 : 1;

      sessionStorage.setItem(key, JSON.stringify({ count: nextCount, lastTs: now }));

      if (nextCount > 3) {
        setAuthRedirectBlocked(true);
        setDidTriggerAuthRedirect(true);
        return;
      }

      setDidTriggerAuthRedirect(true);
      navigateToLogin();
    }

    if (authError?.type !== 'auth_required' && didTriggerAuthRedirect) {
      setDidTriggerAuthRedirect(false);
      setAuthRedirectBlocked(false);
    }
  }, [authError, didTriggerAuthRedirect, navigateToLogin]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (authRedirectBlocked) {
        return (
          <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Login Loop Stopped</h2>
              <p className="mt-2 text-sm text-slate-600">
                We detected repeated authentication redirects and paused auto-login for stability.
                Use the button below to reset session tokens and continue with demo login.
              </p>
              <button
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white"
                onClick={() => {
                  sessionStorage.removeItem('habal_auth_redirect_guard');
                  localStorage.removeItem('base44_access_token');
                  localStorage.removeItem('token');
                  window.location.assign(`${window.location.pathname}?clear_access_token=true#/`);
                }}>
                Reset Session and Continue
              </button>
            </div>
          </div>
        );
      }
      // Redirect happens in effect to avoid repeated redirects during re-renders.
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/ProfileAccount" element={<ProfileAccount />} />
      <Route path="/ProfileRatings" element={<ProfileRatings />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const RouterComponent = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
    ? HashRouter
    : BrowserRouter;

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <RouterComponent>
          <AuthenticatedApp />
        </RouterComponent>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App