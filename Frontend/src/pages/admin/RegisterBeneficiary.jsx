import React, { useEffect, useState } from "react";
import SuccessMessage from "../../components/SuccessMessage";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import API from "../../services/api";

/**
 * RegisterBeneficiary component.
 * Allows Admin to add beneficiaries, map them to a Fair Price Shop Dealer, and deploy them on-chain.
 */
const RegisterBeneficiary = () => {
  const [formData, setFormData] = useState({
    name: "",
    rationCardNumber: "",
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess("");
    setWallet("");
    setIsSynced(false);
    setError("");

    try {
      const res = await API.post("/api/admin/register-beneficiary", {
        ...formData,
        monthlyEntitlement: Number(formData.monthlyEntitlement)
      });
      const { walletAddress, isRegisteredOnChain, name, rationCardNumber } = res.data.data;
      
      setSuccess(`Beneficiary '${name}' (Card: ${rationCardNumber}) successfully registered.`);
      setWallet(walletAddress);
      setIsSynced(isRegisteredOnChain);

      // Clear inputs
      setFormData({
        name: "",
        rationCardNumber: "",
        password: "",
        monthlyEntitlement: "",
        registeredDealerId: ""
      });
    } catch (err) {
      console.error("[REGISTER BENEFICIARY ERROR]", err);
      setError(
        err.response?.data?.message || 
        "Failed to register beneficiary. Check connection or card number uniqueness."
      );
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
          Registers the beneficiary, assigns them to a distribution shop, creates a wallet, and writes the state to the blockchain ledger.
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Beneficiary Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="name">
                Beneficiary Full Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Ration Card Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="rationCardNumber">
                Ration Card Number (Unique ID)
              </label>
              <input
                type="text"
                id="rationCardNumber"
                className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                placeholder="RC-99008811"
                value={formData.rationCardNumber}
                onChange={handleChange}
                required
              />
            </div>

            {/* Account Password */}
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

            {/* Monthly Entitlement (kg) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="monthlyEntitlement">
                Monthly Entitlement Allocation (kg)
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
          </div>

          {/* Assigned Dealer dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 px-1" htmlFor="registeredDealerId">
              Assigned Distribution Shop (Dealer)
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

          {/* Action button */}
          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-6 bg-navy text-white rounded font-semibold text-sm hover:bg-navy-light transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Deploying to Smart Contract...</span>
              </>
            ) : (
              <span>Register & deploy beneficiary on-chain</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterBeneficiary;
