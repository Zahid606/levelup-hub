import { Navigate } from "@/lib/router-compat";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

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

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireUser>{children}</RequireUser>
    </AuthProvider>
  );
}