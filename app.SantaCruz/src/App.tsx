import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { RequireAuth, RequireRole } from "./routes/guards";

import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/Auth/LoginPage";
import { PanelPage } from "./pages/Panel/PanelPage";
import { TicketDetailPage } from "./pages/Ticket/TicketDetailPage";
import { UsersPage } from "./pages/Admin/UsersPage";
import { SyncRunsPage } from "./pages/Admin/SyncRunsPage";
import { SettingsPage } from "./pages/Admin/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/panel" replace />} />
            <Route path="/panel" element={<PanelPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />

            <Route
              path="/admin/users"
              element={
                <RequireRole role="ADMIN">
                  <UsersPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/sync"
              element={
                <RequireRole role="ADMIN">
                  <SyncRunsPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireRole role="ADMIN">
                  <SettingsPage />
                </RequireRole>
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
