import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

/**
 * Login component with Government Portal style.
 * Automatically handles email (Admin/Dealer) and Ration Card (Beneficiary) routing.
 */
const Login = () => {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {};
      // Auto-detect login identifier (email vs ration card number)
      if (identity.includes("@")) {
        payload.email = identity;
      } else {
        payload.rationCardNumber = identity;
      }
      payload.password = password;

      const response = await API.post("/api/auth/login", payload);
      const { token, user } = response.data.data;

      login(token, user);

      // Route users depending on their designated roles
      if (user.role === "Admin") {
        navigate("/admin/dashboard");
      } else if (user.role === "Dealer") {
        navigate("/dealer/dashboard");
      } else if (user.role === "Beneficiary") {
        navigate("/beneficiary/dashboard");
      }
    } catch (err) {
      console.error("[LOGIN API ERROR]", err);
      setError(
        err.response?.data?.message || 
        "Authentication failed. Please verify credentials and network status."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb] text-[#191c1e]">
      {/* Government Style Header Bar */}
      <header className="bg-navy text-white w-full py-4 px-6 md:px-12 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
            {/* SVG Shield / State Emblem Representation */}
            <svg
              className="w-6 h-6 text-white"
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
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Public Distribution System</h1>
            <p className="text-[10px] opacity-80 mt-1 uppercase tracking-wider font-semibold">
              Blockchain-Powered Ration Management Portal
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-4 text-xs font-semibold opacity-75">
          <span>GOVT. OF INDIA</span>
          <span>•</span>
          <span>SECURE SYSTEM</span>
        </div>
      </header>

      {/* Main Form Center Layout */}
      <main className="flex-grow flex items-center justify-center px-4 py-12 relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#1e3a5f 1px, transparent 1px)", backgroundSize: "32px 32px" }}></div>
        <div className="w-full flex items-center justify-center relative z-10">
          <div className="bg-white w-full max-w-[440px] border border-slate-200 rounded-lg p-8 shadow-sm">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-navy mb-2">Login to Your Account</h2>
              <p className="text-sm text-slate-500">Access the secure blockchain registry</p>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 flex items-start gap-2 text-sm">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Identity Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 px-1" htmlFor="identity">
                  Email or Ration Card Number
                </label>
                <input
                  type="text"
                  id="identity"
                  className="w-full h-12 px-4 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                  placeholder="Enter email or ration card number"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 px-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="w-full h-12 px-4 pr-10 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-4 bg-navy text-white rounded font-semibold text-sm flex items-center justify-center gap-2 hover:bg-navy-light transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col gap-2 items-center text-xs">
              <a className="text-navy font-semibold hover:underline" href="/transparency">
                Public Blockchain Transparency Portal
              </a>
              <span className="text-slate-400">Secure AES-256 State Ledger</span>
            </div>
          </div>
        </div>
      </main>

      {/* Government Footer bar */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 px-6 md:px-12 w-full mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="font-bold text-navy">PDS TrustLink Network</p>
            <p>© 2026 Public Distribution System. All Rights Reserved. National Registry Portal.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 items-center">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <svg
                className="w-4 h-4 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Cryptographically Secure
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Login;
