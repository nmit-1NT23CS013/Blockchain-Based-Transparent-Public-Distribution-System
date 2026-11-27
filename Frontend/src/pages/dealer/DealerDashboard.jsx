import React, { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

/**
 * DealerDashboard component.
 * Displays stock usage stats, progress bars, and recent distribution summaries.
 */
const DealerDashboard = () => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/dealer/stock");
      setStock(res.data.data);
    } catch (err) {
      console.error("[DEALER DASHBOARD ERROR]", err);
      setError("Failed to load inventory stock metadata.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  if (loading) return <LoadingSpinner message="Querying shop inventory stock profiles..." />;

  const allocated = stock?.allocatedStock || 0;
  const current = stock?.currentStock || 0;
  const distributed = Math.max(0, allocated - current);
  const utilizationRate = allocated > 0 ? Math.round((distributed / allocated) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy">Shop Dashboard</h2>
          <p className="text-sm text-slate-500">
            FPS Shop ID: <span className="font-mono font-bold text-slate-700">{stock?.fpsShopId}</span> | 
            Location: <span className="font-semibold text-slate-700">{stock?.location}</span>
          </p>
        </div>
        <button
          onClick={fetchStock}
          className="bg-navy text-white px-4 py-2 text-xs font-semibold rounded hover:bg-navy-light transition-all flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
          Sync Inventory
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Stock metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Allocated Stock (This Cycle)"
          value={`${allocated} kg`}
          color="navy"
          icon={<span className="material-symbols-outlined text-[24px]">local_shipping</span>}
        />
        <StatCard
          title="Current Stock Remaining"
          value={`${current} kg`}
          color="amber"
          icon={<span className="material-symbols-outlined text-[24px]">inventory_2</span>}
        />
        <StatCard
          title="Total Distributed Grains"
          value={`${distributed} kg`}
          color="emerald"
          icon={<span className="material-symbols-outlined text-[24px]">task_alt</span>}
        />
      </div>

      {/* Progress tracking card */}
      <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
        <h3 className="text-base font-bold text-navy mb-4">Stock Utilization Progress</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-slate-500">Utilization Rate</span>
            <span className="text-navy font-bold">{utilizationRate}% Completed</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-250">
            <div
              className="bg-navy h-full rounded-full transition-all duration-500"
              style={{ width: `${utilizationRate}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 text-xs text-slate-500">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="block font-semibold text-slate-450 uppercase">DISTRIBUTED STOCK</span>
              <span className="text-lg font-bold text-slate-800">{distributed} kg</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="block font-semibold text-slate-450 uppercase">REMAINING IN STOCK</span>
              <span className="text-lg font-bold text-slate-800">{current} kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerDashboard;
