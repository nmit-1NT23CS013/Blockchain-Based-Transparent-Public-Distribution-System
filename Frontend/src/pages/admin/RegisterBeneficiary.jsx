import { useEffect, useState } from "react";
import SuccessMessage from "../../components/SuccessMessage";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import API from "../../services/api";

/**
 * RegisterBeneficiary component.
 * Allows Admin to add beneficiaries, verify their identity via OTP,
 * map them to a Fair Price Shop Dealer, and deploy them on-chain.
 */
const RegisterBeneficiary = () => {
  const [formData, setFormData] = useState({
    name: "",
    rationCardNumber: "",
    mobileNumber: "",
    password: "",
    monthlyEntitlement: "",
    registeredDealerId: ""
  });

  const [dealers, setDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [wallet, setWallet] = useState("");
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState("");

  // OTP Verification States
  const [otpSessionId, setOtpSessionId] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [countdown, setCountdown] = useState(0); // in seconds
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const res = await API.get("/api/admin/dealers");
        setDealers(res.data.data);
      } catch (err) {
        console.error("Failed to load dealers dropdown", err);
        setError("Unable to retrieve dealer lists. Dropdown cannot be populated.");
      } finally {
        setLoadingDealers(false);
      }
    };
    fetchDealers();
  }, []);

  // 5-minute countdown timer effect
  useEffect(() => {
    if (countdown <= 0 || isOtpVerified) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setOtpError("OTP has expired. Please generate a new OTP.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isOtpVerified]);

  const formatCountdown = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    // Security reset: Changing ration card or mobile resets OTP verification
    if (id === "rationCardNumber" || id === "mobileNumber") {
      if (isOtpVerified || otpSent) {
        setIsOtpVerified(false);
        setVerificationToken("");
        setOtpSent(false);
        setOtpSessionId("");
        setOtpInput("");
        setOtpSuccess("");
        setCountdown(0);
        setAttemptsRemaining(3);
        setIsSessionLocked(false);
        setOtpError("Card or mobile number changed. Please re-generate and verify OTP.");
      }
    }
  };

  const handleGenerateOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError("");
    setOtpSuccess("");

    const trimmedCard = formData.rationCardNumber.trim();
    const trimmedMobile = formData.mobileNumber.trim();

    if (!trimmedCard) {
      setOtpError("Please enter a Ration Card Number before generating OTP.");
      return;
    }

    // Indian mobile number validation: 10 digits starting with 6, 7, 8, or 9
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!trimmedMobile || !indianMobileRegex.test(trimmedMobile)) {
      setOtpError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await API.post("/api/admin/generate-otp", {
        mobileNumber: trimmedMobile,
        rationCardNumber: trimmedCard
      });

      setOtpSessionId(res.data.data.otpSessionId);
      setOtpSent(true);
      setIsOtpVerified(false);
      setVerificationToken("");
      setOtpInput("");
      setAttemptsRemaining(3);
      setIsSessionLocked(false);
      setCountdown(300); // 5 minutes = 300 seconds
      setOtpSuccess("OTP generated successfully! Check your backend server terminal to read the demo code.");
    } catch (err) {
      console.error("[GENERATE OTP ERROR]", err);
      setOtpError(err.response?.data?.message || "Failed to generate OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError("");
    setOtpSuccess("");

    const trimmedOtp = otpInput.trim();
    if (trimmedOtp.length !== 6) {
      setOtpError("Please enter the complete 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await API.post("/api/admin/verify-otp", {
        otpSessionId,
        otp: trimmedOtp
      });

      setVerificationToken(res.data.data.verificationToken);
      setIsOtpVerified(true);
      setCountdown(0);
      setOtpSuccess("OTP verified successfully! Beneficiary identity confirmed.");
    } catch (err) {
      console.error("[VERIFY OTP ERROR]", err);
      const remaining = err.response?.data?.data?.attemptsRemaining;
      if (typeof remaining === "number") {
        setAttemptsRemaining(remaining);
        if (remaining === 0) {
          setIsSessionLocked(true);
        }
      }
      setOtpError(err.response?.data?.message || "Invalid OTP entered. Please check backend terminal.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOtpVerified) {
      setError("Please complete OTP verification before registering the beneficiary.");
      return;
    }

    setSubmitting(true);
    setSuccess("");
    setWallet("");
    setIsSynced(false);
    setError("");

    try {
      const res = await API.post("/api/admin/register-beneficiary", {
        ...formData,
        monthlyEntitlement: Number(formData.monthlyEntitlement),
        verificationToken
      });
      const { walletAddress, isRegisteredOnChain, name, rationCardNumber } = res.data.data;
      
      setSuccess(`Beneficiary '${name}' (Card: ${rationCardNumber}) successfully registered.`);
      setWallet(walletAddress);
      setIsSynced(isRegisteredOnChain);

      // Clear all inputs & reset OTP state
      setFormData({
        name: "",
        rationCardNumber: "",
        mobileNumber: "",
        password: "",
        monthlyEntitlement: "",
        registeredDealerId: ""
      });
      setIsOtpVerified(false);
      setVerificationToken("");
      setOtpSent(false);
      setOtpSessionId("");
      setOtpInput("");
      setOtpSuccess("");
      setCountdown(0);
      setAttemptsRemaining(3);
      setIsSessionLocked(false);

    } catch (err) {
      console.error("[REGISTER BENEFICIARY ERROR]", err);
      const errMsg = err.response?.data?.message || "Failed to register beneficiary. Check connection or card number uniqueness.";
      setError(errMsg);

      // If backend rejected verification token, reset verification so admin can get a fresh OTP
      if (errMsg.toLowerCase().includes("token") || errMsg.toLowerCase().includes("otp")) {
        setIsOtpVerified(false);
        setVerificationToken("");
        setOtpSent(false);
        setOtpSessionId("");
        setOtpInput("");
        setOtpSuccess("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDealers) return <LoadingSpinner message="Fetching licensed dealer profiles for dropdown selection..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">Register PDS Beneficiary</h2>
        <p className="text-sm text-slate-500">
          Verify beneficiary identity via OTP, assign a distribution shop, generate a ledger wallet, and sync on-chain.
        </p>
      </div>

      {success && (
        <div className="space-y-4">
          <SuccessMessage 
            message={
              isSynced 
                ? `${success} Blockchain state confirmed.` 
                : `${success} Pending blockchain transaction write.`
            } 
          />
          {wallet && (
            <div className="p-4 bg-navy/5 text-navy border border-navy/10 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold uppercase tracking-wider">Assigned Ledger Address</h4>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSynced ? "bg-emerald-100 text-emerald-800 border border-emerald-250" : "bg-amber-100 text-amber-800 border border-amber-250"
                }`}>
                  {isSynced ? "ON-CHAIN SYNCED" : "SYNC PENDING"}
                </span>
              </div>
              <p className="text-xs font-mono select-all bg-white px-3 py-2 border border-slate-200 rounded text-slate-800">
                {wallet}
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                * The beneficiary can now use their Ration Card Number and temporary password to log in.
              </p>
            </div>
          )}
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Beneficiary Details */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              1. Cardholder Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Beneficiary Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 px-1" htmlFor="name">
                  Beneficiary Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Ration Card Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 px-1" htmlFor="rationCardNumber">
                  Ration Card Number (Unique ID) *
                </label>
                <input
                  type="text"
                  id="rationCardNumber"
                  className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                  placeholder="e.g. RC-99008811"
                  value={formData.rationCardNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 px-1" htmlFor="mobileNumber">
                  Mobile Number (Indian 10-Digit) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-bold text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="mobileNumber"
                    maxLength={10}
                    pattern="[6-9][0-9]{9}"
                    className="w-full h-11 pl-11 pr-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                    placeholder="9876543210"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 px-1">
                  * Must be a 10-digit number starting with 6, 7, 8, or 9.
                </p>
              </div>

              {/* Temporary Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 px-1" htmlFor="password">
                  Temporary Account Password *
                </label>
                <input
                  type="password"
                  id="password"
                  className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Monthly Entitlement */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 px-1" htmlFor="monthlyEntitlement">
                  Monthly Entitlement Allocation (kg) *
                </label>
                <input
                  type="number"
                  id="monthlyEntitlement"
                  className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                  placeholder="35"
                  min="1"
                  value={formData.monthlyEntitlement}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Assigned Dealer */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 px-1" htmlFor="registeredDealerId">
                  Assigned Distribution Center (Dealer) *
                </label>
                <select
                  id="registeredDealerId"
                  className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                  value={formData.registeredDealerId}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Distribution Center --</option>
                  {dealers.map((dealer) => (
                    <option key={dealer._id} value={dealer._id}>
                      {dealer.userId?.name || "Dealer"} - {dealer.fpsShopId} ({dealer.location})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: OTP Verification Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-sm font-bold text-navy">
                  2. Beneficiary Identity Verification (OTP)
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isOtpVerified 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : otpSent 
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-200 text-slate-600"
              }`}>
                {isOtpVerified ? "VERIFIED ✓" : otpSent ? "AWAITING CODE" : "OTP REQUIRED"}
              </span>
            </div>

            {/* OTP Alert messages */}
            {otpError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded border border-emerald-200 flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{otpSuccess}</span>
              </div>
            )}

            {/* Verified Confirmation Panel */}
            {isOtpVerified ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-4 text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Identity & Phone Verification Complete</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Verified for Ration Card <strong>{formData.rationCardNumber}</strong> and Mobile <strong>+91 {formData.mobileNumber}</strong>. You may now submit and deploy this cardholder profile.
                </p>
                {isOtpVerified && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded border border-emerald-300 w-fit">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Single-Use Registration Authorization Active</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Step A: Generate OTP Button (if not generated yet) */}
                {!otpSent ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded border border-slate-200">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Dispatch 6-Digit Verification OTP
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Generates a secure 6-digit code logged to backend terminal for demonstration.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateOtp}
                      disabled={otpLoading || !formData.rationCardNumber || !formData.mobileNumber}
                      className="h-10 px-5 bg-navy text-white text-xs font-bold rounded hover:bg-navy-light transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                    >
                      {otpLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <span>Generate OTP</span>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Step B: Enter and Verify 6-digit OTP */
                  <div className="bg-white p-4 rounded border border-slate-200 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900 flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-bold">Demonstration Notice:</span> The 6-digit OTP has been printed directly to your <strong>Backend Server Terminal</strong>. Please inspect the terminal output and enter the code below.
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-48">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="••••••"
                          value={otpInput}
                          disabled={verifyingOtp || isSessionLocked || countdown === 0}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                          className="w-full h-11 text-center font-mono text-lg font-bold tracking-widest bg-slate-50 border border-slate-300 rounded focus:border-navy focus:bg-white focus:ring-1 focus:ring-navy transition-all outline-none text-slate-900"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otpInput.length !== 6 || isSessionLocked || countdown === 0}
                        className="h-11 px-6 bg-navy text-white text-xs font-bold rounded hover:bg-navy-light transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto shrink-0"
                      >
                        {verifyingOtp ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Validating...</span>
                          </>
                        ) : (
                          <span>Verify OTP</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateOtp}
                        disabled={otpLoading}
                        className="h-11 px-4 text-navy hover:text-navy-light text-xs font-bold hover:underline transition-all w-full sm:w-auto"
                      >
                        Resend / New OTP
                      </button>
                    </div>

                    {/* Timer and Attempts status line */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-600">Time Remaining:</span>
                        <span className={`font-mono font-bold ${countdown < 60 ? "text-red-600 animate-pulse" : "text-navy"}`}>
                          {formatCountdown(countdown)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-600">Attempts Remaining:</span>
                        <span className={`font-bold ${attemptsRemaining <= 1 ? "text-red-600" : "text-slate-800"}`}>
                          {attemptsRemaining} of 3
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={submitting || !isOtpVerified}
              className={`h-11 w-full px-6 rounded font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                isOtpVerified && !submitting
                  ? "bg-navy text-white hover:bg-navy-light cursor-pointer shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Deploying to Smart Contract...</span>
                </>
              ) : isOtpVerified ? (
                <span>Register & deploy beneficiary on-chain</span>
              ) : (
                <span>Complete OTP Verification Above to Enable Registration</span>
              )}
            </button>

            {!isOtpVerified && (
              <p className="text-[11px] text-center text-slate-400 font-medium">
                * The registration button is disabled until the 6-digit OTP is verified.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterBeneficiary;
