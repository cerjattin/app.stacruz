import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "../lib/types";
import { useAuth } from "../context/AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-600">Cargando…</div>
        </div>
      </div>
    );
  }

  if (state.status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.status !== "authenticated") return <Navigate to="/login" replace />;
  if (state.user.role !== role) return <Navigate to="/panel" replace />;
  return <>{children}</>;
}
