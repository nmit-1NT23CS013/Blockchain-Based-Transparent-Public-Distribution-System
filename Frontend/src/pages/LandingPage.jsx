import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * PDS TrustLink Landing Page component.
 * Uses a professional, high-fidelity government portal layout with a deep navy palette.
 */
const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#191c1e] font-sans selection:bg-[#1e3a5f]/10">
      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#c4c6cf]/30 flex justify-between items-center w-full px-6 md:px-12 h-16 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#022448] flex items-center justify-center rounded">
            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance
            </span>
          </div>
          <span className="text-lg font-bold text-[#022448] tracking-tight">PDS TrustLink</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/transparency")}
            className="text-xs md:text-sm font-semibold text-[#022448] border border-[#022448] px-4 py-2 rounded hover:bg-[#022448]/5 transition-colors focus:outline-none"
          >
            Transparency Portal
          </button>
          <button
            onClick={() => navigate("/login")}
            className="text-xs md:text-sm font-semibold bg-[#022448] text-white px-4 py-2 rounded hover:bg-[#022448]/90 transition-colors shadow-sm focus:outline-none"
          >
            Login
          </button>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="bg-gradient-to-br from-[#022448] to-[#1e3a5f] text-white py-20 px-6 md:px-12 relative overflow-hidden">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)",
              backgroundSize: "40px 40px"
            }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 items-center gap-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
              <span className="material-symbols-outlined text-sm text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">Official Government Portal</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Blockchain-Powered Public Distribution System
            </h1>
            <p className="text-base md:text-lg text-slate-200/80 leading-relaxed max-w-xl">
              A transparent, tamper-proof ration management platform ensuring fair and verifiable grain distribution to every eligible beneficiary through decentralized ledger technology.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => navigate("/login")}
                className="bg-white text-[#022448] px-8 py-3 rounded font-bold text-sm hover:bg-slate-100 transition-all shadow-lg transform hover:-translate-y-0.5"
              >
                Login to Portal
              </button>
              <button
                onClick={() => navigate("/transparency")}
                className="border border-white/40 text-white px-8 py-3 rounded font-bold text-sm hover:bg-white/10 transition-all transform hover:-translate-y-0.5"
              >
                View Live Blockchain Records
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/10 relative">
              <div className="absolute -top-3 -left-3 bg-[#022448] text-white px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider border border-white/10 shadow-sm">
                System Registry
              </div>
              <div className="bg-slate-950 rounded overflow-hidden h-64 flex items-center justify-center relative shadow-inner border border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-[#022448]/20 to-slate-950/40 pointer-events-none"></div>
                <span className="material-symbols-outlined text-6xl text-slate-500 opacity-15 animate-pulse absolute">
                  hub
                </span>
                <div className="z-10 text-center space-y-2 p-6">
                  <p className="text-xs font-mono text-emerald-400 font-semibold tracking-wider">NETWORK STATUS: ACTIVE</p>
                  <p className="text-sm font-bold text-white uppercase tracking-tight">Ledger Synchronization</p>
                  <div className="flex items-center justify-center gap-1.5 pt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[11px] font-mono text-slate-350">Synced with Ganache Node</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Bar */}
      <section className="bg-white py-10 border-b border-[#c4c6cf]/30 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
          <div className="flex flex-col items-center text-center space-y-2">
            <span className="material-symbols-outlined text-[#022448] text-4xl">shield</span>
            <p className="text-sm font-bold text-[#022448]">Secured by Blockchain</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <span className="material-symbols-outlined text-[#022448] text-4xl">history_edu</span>
            <p className="text-sm font-bold text-[#022448]">Tamper-Proof Records</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <span className="material-symbols-outlined text-[#022448] text-4xl">admin_panel_settings</span>
            <p className="text-sm font-bold text-[#022448]">Role-Based Access</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <span className="material-symbols-outlined text-[#022448] text-4xl">visibility</span>
            <p className="text-sm font-bold text-[#022448]">Real-Time Transparency</p>
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section className="py-20 px-6 md:px-12 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#022448] mb-4">How It Works</h2>
            <div className="w-20 h-1 bg-[#022448] mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-slate-200 -translate-y-12"></div>

            <div className="relative flex flex-col items-center text-center space-y-4 z-10 bg-white p-6 rounded border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#022448] flex items-center justify-center text-white font-bold text-lg shadow-md mb-2">
                1
              </div>
              <h3 className="text-lg font-bold text-[#022448]">Allocation</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Admin registers dealers and beneficiaries, allocating monthly grain entitlements on the blockchain registry.
              </p>
            </div>

            <div className="relative flex flex-col items-center text-center space-y-4 z-10 bg-white p-6 rounded border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#022448] flex items-center justify-center text-white font-bold text-lg shadow-md mb-2">
                2
              </div>
              <h3 className="text-lg font-bold text-[#022448]">Distribution</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Dealer receives grain stock and distributes ration quantity securely to registered cardholders.
              </p>
            </div>

            <div className="relative flex flex-col items-center text-center space-y-4 z-10 bg-white p-6 rounded border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#022448] flex items-center justify-center text-white font-bold text-lg shadow-md mb-2">
                3
              </div>
              <h3 className="text-lg font-bold text-[#022448]">Receipt</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Beneficiary collects their ration and receives a cryptographically signed, verifiable digital receipt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Why Blockchain? */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#022448] mb-4">Why Blockchain?</h2>
            <div className="w-20 h-1 bg-[#022448] mx-auto rounded-full"></div>
            <p className="text-slate-500 mt-4 text-sm md:text-base max-w-xl mx-auto">
              Decentralized ledger technology ensures civic trust, eliminates leaks, and guarantees absolute data protection.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#f8fafc] p-8 border border-slate-200 rounded hover:border-[#022448] transition-all hover:-translate-y-1 hover:shadow-sm">
              <span className="material-symbols-outlined text-[#022448] text-3xl mb-4">lock</span>
              <h4 className="text-lg font-bold text-[#022448] mb-2">Immutable Records</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Once recorded, distribution transactions cannot be altered, bypassed, or deleted by any node on the network.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-8 border border-slate-200 rounded hover:border-[#022448] transition-all hover:-translate-y-1 hover:shadow-sm">
              <span className="material-symbols-outlined text-[#022448] text-3xl mb-4">content_paste_off</span>
              <h4 className="text-lg font-bold text-[#022448] mb-2">Duplicate Prevention</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Smart contracts strictly block multiple ration collections in the same monthly cycle, eliminating fraud.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-8 border border-slate-200 rounded hover:border-[#022448] transition-all hover:-translate-y-1 hover:shadow-sm">
              <span className="material-symbols-outlined text-[#022448] text-3xl mb-4">receipt_long</span>
              <h4 className="text-lg font-bold text-[#022448] mb-2">Digital Receipts</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Every distribution generates an immutable cryptographic receipt block searchable on the public portal.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-8 border border-slate-200 rounded hover:border-[#022448] transition-all hover:-translate-y-1 hover:shadow-sm">
              <span className="material-symbols-outlined text-[#022448] text-3xl mb-4">verified</span>
              <h4 className="text-lg font-bold text-[#022448] mb-2">Role-Based Access</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Clear administrative permissions separate the operational portals for Admin, FPS Dealer, and Beneficiary.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-8 border border-slate-200 rounded hover:border-[#022448] transition-all hover:-translate-y-1 hover:shadow-sm">
              <span className="material-symbols-outlined text-[#022448] text-3xl mb-4">query_stats</span>
              <h4 className="text-lg font-bold text-[#022448] mb-2">Public Transparency</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Live metrics dashboards enable citizen oversight and tracking of grain movements without logins.
              </p>
            </div>

            <div className="bg-[#f8fafc] p-8 border border-slate-200 rounded hover:border-[#022448] transition-all hover:-translate-y-1 hover:shadow-sm">
              <span className="material-symbols-outlined text-[#022448] text-3xl mb-4">manage_search</span>
              <h4 className="text-lg font-bold text-[#022448] mb-2">Tamper-Proof Audit Trail</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tracks state storage transfers down to the local FPS dealer shops with permanent blockchain integrity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Portal Access */}
      <section className="py-20 px-6 md:px-12 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#022448] mb-4">Access the Portal</h2>
            <div className="w-20 h-1 bg-[#022448] mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Admin Access Card */}
            <div className="bg-[#022448] text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all flex flex-col justify-between items-center text-center">
              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                </div>
                <h3 className="text-xl font-bold">Admin Hub</h3>
                <p className="text-sm text-slate-200/80 leading-relaxed">
                  Register FPS dealers, list cardholder profiles, set monthly grain allocations, and sign transfers.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="mt-8 w-full bg-white text-[#022448] py-2.5 rounded font-bold text-sm hover:bg-slate-100 transition-colors shadow focus:outline-none"
              >
                Admin Login
              </button>
            </div>

            {/* Dealer Access Card */}
            <div className="bg-white border border-slate-200 p-8 rounded-xl hover:border-[#022448] transition-all flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md">
              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 bg-[#022448]/5 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-[#022448]">
                    store
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#022448]">Dealer Panel</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Verify eligible cardholders, manage local grain stock levels, distribute rations, and generate digital receipts.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="mt-8 w-full bg-[#022448] text-white py-2.5 rounded font-bold text-sm hover:bg-[#022448]/90 transition-colors shadow focus:outline-none"
              >
                Dealer Login
              </button>
            </div>

            {/* Beneficiary Access Card */}
            <div className="bg-white border border-slate-200 p-8 rounded-xl hover:border-[#022448] transition-all flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md">
              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 bg-[#022448]/5 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-[#022448]">
                    person
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#022448]">Beneficiary Portal</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Verify remaining monthly allocation limits, audit claim logs, and display cryptographic receipt tokens.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="mt-8 w-full border-2 border-[#022448] text-[#022448] py-2.5 rounded font-bold text-sm hover:bg-[#022448]/5 transition-colors focus:outline-none"
              >
                Beneficiary Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Transparency CTA Banner */}
      <section className="py-16 px-6 md:px-12 bg-[#1e3a5f]/10 border-t border-slate-200">
        <div className="max-w-5xl mx-auto bg-[#022448] rounded-2xl p-10 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 text-white space-y-2">
            <h2 className="text-2xl font-bold">Public Transparency Ledger</h2>
            <p className="text-sm md:text-base text-slate-200 max-w-xl">
              All transactions are publicly verifiable on the blockchain. No login required to audit the complete grain transfer and distribution history.
            </p>
          </div>
          <button
            onClick={() => navigate("/transparency")}
            className="relative z-10 shrink-0 bg-white text-[#022448] px-6 py-3.5 rounded font-bold text-sm hover:scale-105 transition-transform flex items-center gap-2 shadow-md focus:outline-none"
          >
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            View Transparency Portal
          </button>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-slate-900 text-white py-16 px-6 md:px-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-800 pb-12 mb-12 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 flex items-center justify-center rounded">
                  <span className="material-symbols-outlined text-white text-lg">account_balance</span>
                </div>
                <span className="text-lg font-bold tracking-tight text-white">PDS TrustLink</span>
              </div>
              <p className="text-slate-400 max-w-xs text-xs md:text-sm">
                PDS Blockchain Registry. A secure government initiative powered by decentralized ledger technology for transparent essential service delivery.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation</h5>
                <ul className="space-y-2 text-xs md:text-sm text-slate-400">
                  <li>
                    <button onClick={() => navigate("/login")} className="hover:text-white transition-colors text-left focus:outline-none">
                      Login Portal
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate("/transparency")} className="hover:text-white transition-colors text-left focus:outline-none">
                      Transparency Dashboard
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Security</h5>
                <ul className="space-y-2 text-xs md:text-sm text-slate-400">
                  <li>Cryptography</li>
                  <li>Smart Contracts</li>
                  <li>Ethereum Ledger</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Info</h5>
                <p className="text-xs text-slate-400 max-w-[200px]">
                  Built as a Final Year Academic Project using React, Node.js, Express, MongoDB, Ethers.js, and Ganache.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-550">
            <p>© {new Date().getFullYear()} PDS Blockchain Registry. Secure Government Portal. All Rights Reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white transition-colors cursor-default text-slate-500">Privacy Policy</span>
              <span className="hover:text-white transition-colors cursor-default text-slate-500">Accessibility</span>
              <span className="hover:text-white transition-colors cursor-default text-slate-500">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
