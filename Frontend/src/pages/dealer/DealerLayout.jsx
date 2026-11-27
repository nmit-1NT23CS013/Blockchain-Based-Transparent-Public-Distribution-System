import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * DealerLayout component.
 * Wrapper layout for licensed FPS Dealers containing their navigation menu.
 */
const DealerLayout = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { name: "Dashboard", path: "/dealer/dashboard", icon: "dashboard" },
    { name: "View Inventory Stock", path: "/dealer/stock", icon: "inventory_2" },
    { name: "Distribute Ration", path: "/dealer/distribute", icon: "workspace_premium" },
    { name: "Distribution History", path: "/dealer/distributions", icon: "history" }
  ];

  const truncatedAddress = currentUser?.walletAddress
    ? `${currentUser.walletAddress.substring(0, 6)}...${currentUser.walletAddress.substring(currentUser.walletAddress.length - 4)}`
    : "No Wallet Registered";

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar navigation */}
      <aside className="w-64 bg-navy text-white flex flex-col justify-between shadow-lg shrink-0">
        <div>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <svg
              className="w-8 h-8 text-white opacity-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <div>
              <h2 className="font-bold text-sm leading-none">PDS TrustLink</h2>
              <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider block mt-1">
                Dealer Panel
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navLinks.map((link, index) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={index}
                  to={link.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-slate-350 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-white/10 bg-navy-dark">
          <div className="mb-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Licensed Dealer:
            </p>
            <p className="text-sm font-bold truncate mt-0.5">{currentUser?.name || "Dealer"}</p>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate" title={currentUser?.walletAddress}>
              {truncatedAddress}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Page Content Shell */}
      <div className="flex-grow flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shadow-sm shrink-0">
          <h2 className="text-navy font-bold text-lg">Fair Price Shop Operations</h2>
          <span className="text-xs bg-navy/5 text-navy border border-navy/10 px-3 py-1.5 rounded-full font-semibold">
            Status: Blockchain Network Online
          </span>
        </header>

        <main className="flex-grow p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DealerLayout;
