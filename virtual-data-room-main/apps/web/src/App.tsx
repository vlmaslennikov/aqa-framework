import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/features/auth/auth-provider";
import { ProtectedRoute, PublicOnlyRoute } from "@/features/auth/route-guards";
import { LoginPage } from "@/features/auth/login-page";
import { RegisterPage } from "@/features/auth/register-page";
import { DataRoomPage } from "@/features/data-room/data-room-page";
import { FilePage } from "@/features/data-room/file-page";
import { FolderPage } from "@/features/data-room/folder-page";
import { RoomPage } from "@/features/data-room/room-page";
import { PublicFileViewPage } from "@/features/sharing/public-file-view-page";
import { PublicSharePage } from "@/features/sharing/public-share-page";
import { SharedWithMePage } from "@/features/sharing/shared-with-me-page";
import { useSectionPrefix } from "@/lib/section";

function NotFoundRedirect() {
  const prefix = useSectionPrefix();
  return <Navigate to={prefix || "/"} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DataRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/folder/:id"
          element={
            <ProtectedRoute>
              <FolderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:id"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/file/:id"
          element={
            <ProtectedRoute>
              <FilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared-with-me"
          element={
            <ProtectedRoute>
              <SharedWithMePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared-with-me/room/:id"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared-with-me/folder/:id"
          element={
            <ProtectedRoute>
              <FolderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared-with-me/file/:id"
          element={
            <ProtectedRoute>
              <FilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/share/:token" element={<PublicSharePage />} />
        <Route path="/share/:token/folders/:folderId" element={<PublicSharePage />} />
        <Route path="/share/:token/files/:fileId" element={<PublicFileViewPage />} />
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
