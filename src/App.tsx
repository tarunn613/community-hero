import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./AppContext";
import { Onboarding } from "./screens/Onboarding";
import { SetupAccount } from "./screens/SetupAccount";
import { AdminRegistration } from "./screens/AdminRegistration";
import { AdminSignIn } from "./screens/AdminSignIn";
import { Home } from "./screens/Home";
import { Capture } from "./screens/Capture";
import { ReportSelect } from "./screens/ReportSelect";
import { Analysis } from "./screens/Analysis";
import { MapScreen } from "./screens/MapScreen";
import { MyReports } from "./screens/MyReports";
import { Leaderboard } from "./screens/Leaderboard";
import { Settings } from "./screens/Settings";
import { SectorSelect } from "./screens/SectorSelect";
import { SectorIssues } from "./screens/SectorIssues";
import { AdminQueue } from "./screens/AdminQueue";
import { AdminReportDetail } from "./screens/AdminReportDetail";
import { ReportDetail } from "./screens/ReportDetail";
import { VerifyNearbyFixes } from "./screens/VerifyNearbyFixes";
import { BottomNav } from "./components/BottomNav";
import { Toaster } from "react-hot-toast";

const CitizenRoute = ({ children, isAuthorized, isAdmin }: { children: React.ReactNode, isAuthorized: boolean, isAdmin: boolean }) => {
  if (!isAuthorized) return <Navigate to="/" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children, isAuthorized, isAdmin }: { children: React.ReactNode, isAuthorized: boolean, isAdmin: boolean }) => {
  if (!isAuthorized) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const RootRoute = ({ isAuthorized, isAdmin }: { isAuthorized: boolean, isAdmin: boolean }) => {
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isAuthorized) return <Navigate to="/home" replace />;
  return <Onboarding />;
};

const AppContent: React.FC = () => {
  const { user, isGuest, loading, userProfile } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-surface-container-high border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-on-surface-variant">Loading Community Hero…</p>
      </div>
    );
  }

  const isAuthorized = !!user || isGuest;
  const isAdmin = userProfile?.role === "sector_admin" || userProfile?.role === "super_admin";

  return (
    <div className="h-[100dvh] w-full bg-surface-container-low flex justify-center items-stretch overflow-hidden">
      <div className="w-full max-w-[430px] h-full bg-background text-on-surface relative flex flex-col border-x border-outline-variant shadow-sm overflow-hidden">
        <Routes>
          <Route path="/"                     element={<RootRoute isAuthorized={isAuthorized} isAdmin={isAdmin} />} />
          <Route path="/setup-account"        element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><SetupAccount /></CitizenRoute>} />
          <Route path="/admin/register"       element={<AdminRegistration />} />
          <Route path="/admin/login"          element={<AdminSignIn />} />
          <Route path="/home"                 element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><Home /></CitizenRoute>} />
          <Route path="/capture"              element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><Capture /></CitizenRoute>} />
          <Route path="/report-select"        element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><ReportSelect /></CitizenRoute>} />
          <Route path="/analysis"             element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><Analysis /></CitizenRoute>} />
          <Route path="/map"                  element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><MapScreen /></CitizenRoute>} />
          <Route path="/sectors"              element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><SectorSelect /></CitizenRoute>} />
          <Route path="/sector/:sectorId"     element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><SectorIssues /></CitizenRoute>} />
          <Route path="/admin"                element={<AdminRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><AdminQueue /></AdminRoute>} />
          <Route path="/admin/report/:id"     element={<AdminRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><AdminReportDetail /></AdminRoute>} />
          <Route path="/report/:id"           element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><ReportDetail /></CitizenRoute>} />
          <Route path="/verify"               element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><VerifyNearbyFixes /></CitizenRoute>} />
          <Route path="/my-reports"           element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><MyReports /></CitizenRoute>} />
          <Route path="/leaderboard"          element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><Leaderboard /></CitizenRoute>} />
          <Route path="/settings"             element={<CitizenRoute isAuthorized={isAuthorized} isAdmin={isAdmin}><Settings /></CitizenRoute>} />
          <Route path="*"                     element={<Navigate to="/" replace />} />
        </Routes>
        {!isAdmin && <BottomNav />}
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#ffffff",
            color: "#141b2b",
            border: "1px solid #E6E8EB",
            fontSize: "13px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          },
          success: { iconTheme: { primary: "#006145", secondary: "#ffffff" } },
          error:   { iconTheme: { primary: "#ba1a1a", secondary: "#ffffff" } }
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}
