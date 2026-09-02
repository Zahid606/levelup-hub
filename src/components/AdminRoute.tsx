import { Navigate } from "@/lib/router-compat";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isManager, isVolunteer, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!isAdmin && !isManager && !isVolunteer) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireStaff>{children}</RequireStaff>
    </AuthProvider>
  );
}