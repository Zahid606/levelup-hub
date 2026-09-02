import { createFileRoute } from "@tanstack/react-router";
import AdminRoute from "@/components/AdminRoute";
import AdminPanel from "@/pages/AdminPanel";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminRoute>
      <AdminPanel />
    </AdminRoute>
  ),
});
