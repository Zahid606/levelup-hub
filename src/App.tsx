import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Lazy-load route components so each page only loads when visited.
// This dramatically reduces the initial JS bundle (xlsx, charts, admin code, etc.).
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const LessonDetail = lazy(() => import("./pages/LessonDetail"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isManager, isVolunteer, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!isAdmin && !isManager && !isVolunteer) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <RequireUser>{children}</RequireUser>
  </AuthProvider>
);

const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <RequireStaff>{children}</RequireStaff>
  </AuthProvider>
);

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/lesson/:id" element={<ProtectedRoute><LessonDetail /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Sonner />
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
