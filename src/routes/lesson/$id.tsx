import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import LessonDetail from "@/pages/LessonDetail";

export const Route = createFileRoute("/lesson/$id")({
  component: () => (
    <ProtectedRoute>
      <LessonDetail />
    </ProtectedRoute>
  ),
});
