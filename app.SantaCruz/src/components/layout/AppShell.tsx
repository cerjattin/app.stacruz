import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="px-4 py-4 sm:px-6 sm:py-6">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
