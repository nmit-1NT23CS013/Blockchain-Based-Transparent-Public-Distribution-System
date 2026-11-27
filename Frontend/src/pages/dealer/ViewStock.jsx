import React, { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

/**
 * ViewStock component.
 * Detailed breakdown of dealer stock, difference calculation, and local inventory records.
 */
const ViewStock = () => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/dealer/stock");
      setStock(res.data.data);
    } catch (err) {
      console.error("View stock page error", err);
      setError("Failed to fetch inventory balances from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  if (loading) return <LoadingSpinner message="Retrieving detailed shop inventory records..." />;

  const allocated = stock?.allocatedStock || 0;
  const current = stock?.currentStock || 0;
  const distributed = Math.max(0, allocated - current);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">Inventory Details</h2>
        <p className="text-sm text-slate-500">
          Review central allocations, remaining balances, and active distributions.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Breakdown Grid */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-navy text-sm uppercase tracking-wider">Inventory Audit Overview</h3>
            <p className="text-xs text-slate-400">Current cycle balance sheets</p>
          </div>
          <span className="text-xs font-mono font-bold bg-navy/5 text-navy border border-navy/15 px-3 py-1 rounded">
            License ID: {stock?.fpsShopId}
          </span>
        </div>

        <div className="p-6 divide-y divide-slate-100">
          {/* Allocated */}
          <div className="py-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-700">Total Central Allocation</p>
              <p className="text-xs text-slate-400">Total grains transferred from central storage</p>
            </div>
            <p className="text-lg font-bold text-slate-800">{allocated} kg</p>
          </div>

          {/* Distributed */}
          <div className="py-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-700">Total Distributed to Beneficiaries</p>
              <p className="text-xs text-slate-400">Grains successfully collection-signed on-chain</p>
            </div>
            <p className="text-lg font-bold text-emerald-600">-{distributed} kg</p>
          </div>

          {/* Current Stock */}
          <div className="py-4 flex justify-between items-center bg-navy/[0.01]">
            <div>
              <p className="font-bold text-navy">Current Shop Balance (Physical)</p>
              <p className="text-xs text-slate-400">Current physical grains available for distribution</p>
            </div>
            <p className="text-xl font-extrabold text-navy">{current} kg</p>
          </div>
        </div>
      </div>

      {/* Stock warning notifications */}
      {current <= 50 && (
        <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-3 text-xs font-medium">
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-bold uppercase tracking-wider">Low Stock Advisory</p>
            <p className="mt-0.5">Physical inventory levels have fallen below 50 kg. Contact Central Administration to request grain transfers.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewStock;
