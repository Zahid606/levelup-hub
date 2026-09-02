import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Contact from "@/pages/Contact";

export const Route = createFileRoute("/contact")({
  component: () => (
    <ProtectedRoute>
      <Contact />
    </ProtectedRoute>
  ),
});
