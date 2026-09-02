import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Leaderboard from "@/pages/Leaderboard";

export const Route = createFileRoute("/leaderboard")({
  component: () => (
    <ProtectedRoute>
      <Leaderboard />
    </ProtectedRoute>
  ),
});
