import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { queryClientInstance } from '@/lib/queryClient';
import PageNotFound from '@/components/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppLayout from '@/components/layout/AppLayout';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import MediaLibrary from '@/pages/MediaLibrary';
import VideoGeneration from '@/pages/VideoGeneration';
import Approval from '@/pages/Approval';
import Schedule from '@/pages/Schedule';
import Publications from '@/pages/Publications';
import Comments from '@/pages/Comments';
import Reports from '@/pages/Reports';
import Commercial from '@/pages/Commercial';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Zap className="h-5 w-5 text-white" fill="white" />
          </div>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/media" element={<MediaLibrary />} />
        <Route path="/videos" element={<VideoGeneration />} />
        <Route path="/approval" element={<Approval />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/publications" element={<Publications />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/commercial" element={<Commercial />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
