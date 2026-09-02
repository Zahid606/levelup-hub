import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Messages from "@/pages/Messages";

export const Route = createFileRoute("/messages")({
  component: () => (
    <ProtectedRoute>
      <Messages />
    </ProtectedRoute>
  ),
});
