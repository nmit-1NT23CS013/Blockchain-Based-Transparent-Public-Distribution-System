import React, { useState } from "react";
import SuccessMessage from "../../components/SuccessMessage";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

/**
 * AllocateEntitlement component.
 * Allows PDS Administrators to search beneficiaries by ration card and alter monthly grain allocations.
 */
const AllocateEntitlement = () => {
  const [rationCardNumber, setRationCardNumber] = useState("");
  const [beneficiary, setBeneficiary] = useState(null);
  const [searching, setSearching] = useState(false);
  const [newAllocation, setNewAllocation] = useState("");
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!rationCardNumber) return;

    setSearching(true);
    setBeneficiary(null);
    setSuccess("");
    setTxHash("");
    setError("");

    try {
      // Load all beneficiaries and filter for matching card number
      const res = await API.get("/api/admin/beneficiaries");
      const list = res.data.data;
      const found = list.find(
        (b) => b.rationCardNumber.toLowerCase() === rationCardNumber.trim().toLowerCase()
      );

      if (!found) {
        setError(`No registered beneficiary found with Ration Card Number '${rationCardNumber}'.`);
      } else {
        setBeneficiary(found);
      }
    } catch (err) {
      console.error("Beneficiary search error", err);
      setError("Failed to fetch registry data. Please verify network status.");
    } finally {
      setSearching(false);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!beneficiary || !newAllocation) return;

    setUpdating(true);
    setSuccess("");
    setTxHash("");
    setError("");

    try {
      const res = await API.post("/api/admin/allocate", {
        rationCardNumber: beneficiary.rationCardNumber,
        newEntitlement: Number(newAllocation)
      });
      
      setSuccess(`Successfully allocated new monthly ration: ${newAllocation} kg to ${beneficiary.name}.`);
      
      // Update local beneficiary profile state
      setBeneficiary({ ...beneficiary, monthlyEntitlement: Number(newAllocation) });
      setNewAllocation("");
    } catch (err) {
      console.error("Allocation execution error", err);
      setError(
        err.response?.data?.message || 
        "Failed to register monthly entitlement allocation on blockchain ledger."
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">Allocate Monthly Entitlement</h2>
        <p className="text-sm text-slate-500">
          Modify the monthly ration limit for a registered beneficiary. Writes changes to the smart contract ledger.
        </p>
      </div>

      {success && <SuccessMessage message={success} txHash={txHash} />}
      {error && <ErrorMessage message={error} />}

      {/* 1. Search Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-bold text-navy mb-3">1. Search Beneficiary Registry</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Enter Ration Card Number (e.g. RC-99008811)"
              className="w-full h-11 px-3 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
              value={rationCardNumber}
              onChange={(e) => setRationCardNumber(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="h-11 px-6 bg-navy text-white rounded font-semibold text-sm hover:bg-navy-light transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* 2. Allocation Revision Section */}
      {beneficiary && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-navy border-b border-slate-100 pb-2">
            2. Revise Allocation Entitlement
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">BENEFICIARY NAME</span>
              <span className="font-bold text-slate-800">{beneficiary.name}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">RATION CARD NUMBER</span>
              <span className="font-mono font-bold text-slate-800">{beneficiary.rationCardNumber}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">LEDGER WALLET ADDRESS</span>
              <span className="font-mono text-xs text-slate-650 truncate block" title={beneficiary.walletAddress}>
                {beneficiary.walletAddress}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">CURRENT ENTITLEMENT</span>
              <span className="font-bold text-navy">{beneficiary.monthlyEntitlement} kg / month</span>
            </div>
          </div>

          <form onSubmit={handleAllocate} className="space-y-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 px-1" htmlFor="newAllocation">
                New Monthly Entitlement Allocation (kg)
              </label>
              <div className="relative max-w-[240px]">
                <input
                  type="number"
                  id="newAllocation"
                  className="w-full h-11 px-3 pr-8 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                  placeholder="30"
                  min="1"
                  value={newAllocation}
                  onChange={(e) => setNewAllocation(e.target.value)}
                  required
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">kg</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="h-11 px-6 bg-navy text-white rounded font-semibold text-sm hover:bg-navy-light transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75"
            >
              {updating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Updating Ledger State...</span>
                </>
              ) : (
                <span>Update Monthly Allocation</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AllocateEntitlement;
