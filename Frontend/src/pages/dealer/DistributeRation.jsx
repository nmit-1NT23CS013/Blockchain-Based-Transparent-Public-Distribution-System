import React, { useState } from "react";
import SuccessMessage from "../../components/SuccessMessage";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

/**
 * DistributeRation component.
 * Allows Dealers to check beneficiary status, distribute grains, and execute receipt generation.
 */
const DistributeRation = () => {
  const [rationCardNumber, setRationCardNumber] = useState("");
  const [beneficiary, setBeneficiary] = useState(null);
  const [searching, setSearching] = useState(false);
  const [distributeQty, setDistributeQty] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!rationCardNumber) return;

    setSearching(true);
    setBeneficiary(null);
    setReceipt(null);
    setError("");

    try {
      const res = await API.get(`/api/dealer/beneficiary/${rationCardNumber.trim()}`);
      setBeneficiary(res.data.data);
      setDistributeQty(res.data.data.monthlyEntitlement); // pre-populate with full entitlement
    } catch (err) {
      console.error("Beneficiary search error", err);
      setError(
        err.response?.data?.message || 
        "No registered beneficiary found with that Ration Card Number."
      );
    } finally {
      setSearching(false);
    }
  };

  const handleDistribute = async (e) => {
    e.preventDefault();
    if (!beneficiary || !distributeQty) return;

    setProcessing(true);
    setError("");
    setReceipt(null);

    try {
      // 1. Distribute ration (writes collectRation to BeneficiaryManagement contract)
      const distRes = await API.post("/api/dealer/distribute", {
        rationCardNumber: beneficiary.rationCardNumber,
        quantity: Number(distributeQty)
      });

      const txHash = distRes.data.data.transactionHash;

      // 2. Chain receipt generation (writes generateReceipt to ReceiptManager contract)
      console.log(`[CHAINING] Generating immutable receipt for tx: ${txHash}...`);
      const receiptRes = await API.post("/api/dealer/receipt", {
        beneficiaryId: Number(beneficiary.rationCardNumber.replace(/\D/g, "")) || 1, // numeric ID fallback
        quantity: Number(distributeQty),
        transactionReference: txHash
      });

      // Save receipt output to display
      setReceipt({
        receiptId: receiptRes.data.data.receiptId,
        transactionHash: txHash,
        quantity: distributeQty,
        timestamp: new Date()
      });

      // Mark local beneficiary status as collected
      setBeneficiary({ ...beneficiary, hasCollectedThisMonth: true });
    } catch (err) {
      console.error("Distribution chained failed", err);
      setError(
        err.response?.data?.message || 
        "Failed to distribute ration. Please verify shop inventory levels."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">Distribute Ration Grains</h2>
        <p className="text-sm text-slate-500">
          Verify beneficiary eligibility, authorize distribution, and generate a blockchain receipt.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* 1. Search Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-bold text-navy mb-3">1. Search Ration Card Number</h3>
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

      {/* Chained Receipt Card */}
      {receipt && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg p-6 text-[#065f46] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Ration Collection Verified on Blockchain!</span>
          </div>

          <div className="bg-white border border-[#a7f3d0] rounded p-4 text-sm text-slate-700 divide-y divide-slate-100 font-medium">
            <div className="py-2 flex justify-between">
              <span className="text-slate-450 uppercase text-[10px] font-bold">Receipt ID</span>
              <span className="font-bold text-navy">#{receipt.receiptId || "PENDING"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-450 uppercase text-[10px] font-bold">Quantity Issued</span>
              <span className="font-bold text-slate-800">{receipt.quantity} kg</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-450 uppercase text-[10px] font-bold">Timestamp</span>
              <span className="text-slate-500 text-xs">{receipt.timestamp.toLocaleString()}</span>
            </div>
            <div className="py-2 flex flex-col gap-1">
              <span className="text-slate-450 uppercase text-[10px] font-bold">Ledger Proof (Tx Hash)</span>
              <span className="font-mono text-[10px] text-slate-400 select-all block break-all">
                {receipt.transactionHash}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Beneficiary Result Sheet */}
      {beneficiary && !receipt && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-navy border-b border-slate-100 pb-2">
            2. Beneficiary Identification Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">CARDHOLDER NAME</span>
              <span className="font-bold text-slate-800">{beneficiary.name}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">RATION CARD NUMBER</span>
              <span className="font-mono font-bold text-slate-800">{beneficiary.rationCardNumber}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">LEDGER WALLET</span>
              <span className="font-mono text-xs text-slate-650 truncate block" title={beneficiary.walletAddress}>
                {beneficiary.walletAddress}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">MONTHLY ENTITLEMENT</span>
              <span className="font-bold text-navy">{beneficiary.monthlyEntitlement} kg</span>
            </div>
          </div>

          {beneficiary.hasCollectedThisMonth ? (
            <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Double Collection Preventive Block: Ration already collected for this month!</span>
            </div>
          ) : (
            <form onSubmit={handleDistribute} className="space-y-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 px-1" htmlFor="distributeQty">
                  Quantity to Issue (kg)
                </label>
                <div className="relative max-w-[240px]">
                  <input
                    type="number"
                    id="distributeQty"
                    className="w-full h-11 px-3 pr-8 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                    placeholder="35"
                    max={beneficiary.monthlyEntitlement}
                    min="1"
                    value={distributeQty}
                    onChange={(e) => setDistributeQty(e.target.value)}
                    required
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">kg</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-1">
                  * Must not exceed the beneficiary's maximum entitlement of {beneficiary.monthlyEntitlement} kg.
                </p>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="h-11 px-6 bg-navy text-white rounded font-semibold text-sm hover:bg-navy-light transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Executing Blockchain Transfers & Chaining Receipt...</span>
                  </>
                ) : (
                  <span>Distribute Ration & Sign on Ledger</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default DistributeRation;
