import React, { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

/**
 * BeneficiaryDashboard component.
 * Displays cardholder's allocation quota and real-time ledger verification states.
 */
const BeneficiaryDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEntitlement = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/beneficiary/entitlement");
      setData(res.data.data);
    } catch (err) {
      console.error("[BENEFICIARY ENTITLEMENT FETCH ERROR]", err);
      setError("Failed to fetch monthly ration allocation limits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitlement();
  }, []);

  if (loading) return <LoadingSpinner message="Querying live cardholder allocation limits..." />;

  const isCollected = data?.hasCollectedThisMonth || false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy">Welcome, {data?.name}</h2>
          <p className="text-sm text-slate-500">
            Ration Card Number: <span className="font-mono font-bold text-slate-700">{data?.rationCardNumber}</span>
          </p>
        </div>
        <button
          onClick={fetchEntitlement}
          className="bg-navy text-white px-4 py-2 text-xs font-semibold rounded hover:bg-navy-light transition-all flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
          Sync Quota Status
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Monthly Allocation Limit"
          value={`${data?.monthlyEntitlement || 0} kg`}
          color="navy"
          icon={<span className="material-symbols-outlined text-[24px]">assignment</span>}
        />
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Collection Status (This Month)
            </h3>
            <div className="mt-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                isCollected 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-250" 
                  : "bg-amber-100 text-amber-800 border border-amber-250"
              }`}>
                {isCollected ? "GRAINS COLLECTED" : "PENDING COLLECTION"}
              </span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isCollected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            <span className="material-symbols-outlined text-[24px]">
              {isCollected ? "task_alt" : "hourglass_empty"}
            </span>
          </div>
        </div>
      </div>

      {/* Assigned Dealer Center Details */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-navy text-sm uppercase tracking-wider">Assigned Fair Price Shop (FPS)</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">DEALER SHOP LICENSE ID</span>
            <span className="font-mono font-bold text-slate-800">{data?.registeredDealer?.fpsShopId || "N/A"}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">PHYSICAL OUTLET LOCATION</span>
            <span className="font-semibold text-slate-700">{data?.registeredDealer?.location || "N/A"}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">LEDGER WALLET ADDRESS</span>
            <span className="font-mono text-xs text-slate-500 truncate block" title={data?.walletAddress}>
              {data?.walletAddress}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryDashboard;
