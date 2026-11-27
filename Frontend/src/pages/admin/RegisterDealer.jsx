import React, { useState } from "react";
import SuccessMessage from "../../components/SuccessMessage";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

/**
 * RegisterDealer component.
 * Allows PDS central administrator to add new dealers and outputs their blockchain wallet credentials.
 */
const RegisterDealer = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    fpsShopId: "",
    location: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setWallet("");
    setError("");

    try {
      const res = await API.post("/api/admin/register-dealer", formData);
      const { walletAddress, name, fpsShopId } = res.data.data;
      
      setSuccess(`Dealer '${name}' (License: ${fpsShopId}) registered successfully in database and allocated a blockchain profile.`);
      setWallet(walletAddress);
      
      // Clear form inputs
      setFormData({
        name: "",
        email: "",
        password: "",
        fpsShopId: "",
        location: ""
      });
    } catch (err) {
      console.error("[REGISTER DEALER ERROR]", err);
      setError(
        err.response?.data?.message || 
        "Failed to register dealer shop profile. Please verify fields and network status."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">Register Fair Price Shop Dealer</h2>
        <p className="text-sm text-slate-500">
          Registers the dealer profile off-chain and auto-generates a secure programmatic Ethereum wallet.
        </p>
      </div>

      {success && (
        <div className="space-y-4">
          <SuccessMessage message={success} />
          {wallet && (
            <div className="p-4 bg-navy/5 text-navy border border-navy/10 rounded-lg shadow-sm">
              <h4 className="text-sm font-bold uppercase tracking-wider mb-1">Generated Ethereum Wallet</h4>
              <p className="text-xs font-mono select-all bg-white px-3 py-2 border border-slate-200 rounded text-slate-800">
                {wallet}
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                * Private keys are AES-256 encrypted and stored securely on the backend server database.
              </p>
            </div>
          )}
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dealer Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="name">
                Dealer Representative Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                placeholder="Enter representative name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="email">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                placeholder="dealer@gov.in"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="password">
                Temporary Account Password
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

            {/* FPS Shop License ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="fpsShopId">
                FPS Shop License Identifier
              </label>
              <input
                type="text"
                id="fpsShopId"
                className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                placeholder="FPS-99887766"
                value={formData.fpsShopId}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 px-1" htmlFor="location">
              Shop Physical Address / Location
            </label>
            <textarea
              id="location"
              rows={2}
              className="w-full p-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
              placeholder="Provide exact street location, district, and pincode"
              value={formData.location}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-6 bg-navy text-white rounded font-semibold text-sm hover:bg-navy-light transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Registering on Server...</span>
              </>
            ) : (
              <span>Register Dealer representative</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterDealer;
