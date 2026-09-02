import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentDashboard from "@/pages/StudentDashboard";

export const Route = createFileRoute("/")({
  component: () => (
    <ProtectedRoute>
      <StudentDashboard />
    </ProtectedRoute>
  ),
});
