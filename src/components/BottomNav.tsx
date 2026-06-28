import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const visiblePaths = ["/home", "/map", "/my-reports", "/leaderboard", "/settings", "/report-select", "/verify"];
  const isVisible = visiblePaths.includes(path) || path.startsWith("/sector/");
  if (!isVisible) return null;

  const navItem = (to: string, icon: string, label: string) => {
    const active = path === to || (to === "/map" && path.startsWith("/sector"));
    return (
      <Link
        to={to}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors active:scale-90"
      >
        <span
          className={`material-symbols-outlined text-[22px] transition-colors ${active ? "text-primary" : "text-on-surface-variant"}`}
          style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          {icon}
        </span>
        <span className={`text-[10px] font-semibold transition-colors ${active ? "text-primary" : "text-on-surface-variant"}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      id="bottom_navigation_bar"
      aria-label="Primary"
      className="shrink-0 bg-surface border-t border-outline-variant flex items-center justify-around px-2 py-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {navItem("/home",        "home",                 "Home")}
      {navItem("/map",         "map",                  "Map")}

      {/* Central report FAB */}
      <button
        onClick={() => navigate("/report-select")}
        id="camera_fab_button"
        aria-label="Report a new issue"
        className="flex items-center justify-center rounded-full bg-primary-container text-on-primary w-12 h-12 -mt-5 shadow-lg fab-glow hover:bg-primary active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
      </button>

      {navItem("/my-reports",  "format_list_bulleted",  "Reports")}
      {navItem("/settings",    "person",               "Profile")}
    </nav>
  );
};
