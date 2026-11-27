import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Global navigation top-bar used primarily for public routes or landing configurations.
 */
const Navbar = () => {
  const { isAuthenticated, logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-navy text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <svg
          className="w-8 h-8 text-white opacity-95"
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
          <Link to="/" className="font-bold text-base hover:underline block leading-none">
            Public Distribution System
          </Link>
          <span className="text-[9px] opacity-75 uppercase tracking-wider font-semibold mt-0.5 block">
            Blockchain-Powered Registry
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-semibold">
        <Link to="/transparency" className="hover:text-slate-300 transition-colors uppercase tracking-wider">
          Transparency Portal
        </Link>
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-normal hidden sm:inline">
              Welcome, {currentUser.name} ({currentUser.role})
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-all font-semibold uppercase tracking-wider"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="bg-white text-navy px-3 py-1.5 rounded hover:bg-slate-200 transition-all uppercase tracking-wider">
            Portal Access
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
