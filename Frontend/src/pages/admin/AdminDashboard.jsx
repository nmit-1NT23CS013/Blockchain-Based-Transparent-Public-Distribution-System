import React, { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/DataTable";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import SuccessMessage from "../../components/SuccessMessage";
import API from "../../services/api";

/**
 * Admin Dashboard screen.
 * Displays metric aggregates and lists the latest 5 blockchain ledger activities.
 */
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [successTxHash, setSuccessTxHash] = useState("");

  const handleResetCycle = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset the monthly collection cycle? " +
      "This will clear the 'hasCollected' status of all registered beneficiaries on the blockchain."
    );

    if (!confirmReset) return;

    try {
      setResetting(true);
      setError("");
      setSuccessMsg("");
      setSuccessTxHash("");

      const res = await API.post("/api/admin/reset-cycle");

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setSuccessTxHash(res.data.data.transactionHash);
        // Refresh stats/transaction log
        fetchData();
      } else {
        setError(res.data.message || "Failed to reset the monthly cycle.");
      }
    } catch (err) {
      console.error("[ADMIN RESET CYCLE ERROR]", err);
      setError(
        err.response?.data?.message || 
        "Failed to reset the monthly cycle. Please check server logs and contract connection."
      );
    } finally {
      setResetting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch stats and public ledger events concurrently
      const [statsRes, txRes] = await Promise.all([
        API.get("/api/admin/stats"),
        API.get("/api/dashboard/transactions")
      ]);

      setStats(statsRes.data.data);
      // Display the last 5 transactions
      setRecentTx(txRes.data.data.slice(0, 5));
    } catch (err) {
      console.error("[ADMIN DASHBOARD DATA ERROR]", err);
      setError("Failed to load dashboard metrics and ledger logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: "Type", accessor: "type", render: (val) => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
        val === "Allocation Transfer" 
          ? "bg-blue-50 text-blue-700 border border-blue-200" 
          : "bg-emerald-50 text-emerald-700 border border-emerald-250"
      }`}>
        {val}
      </span>
    )},
    { header: "Sender (From)", accessor: "actor", render: (val) => (
      <span className="font-semibold text-slate-700 truncate max-w-[200px] block" title={val}>
        {val}
      </span>
    )},
    { header: "Recipient (To)", accessor: "recipient", render: (val) => (
      <span className="font-mono text-xs text-slate-650" title={val}>
        {val ? `${val.substring(0, 8)}...${val.substring(val.length - 6)}` : "N/A"}
      </span>
    )},
    { header: "Quantity (kg)", accessor: "quantity", render: (val) => (
      <span className="font-bold text-slate-900">{val} kg</span>
    )},
    { header: "Timestamp", accessor: "timestamp", render: (val) => (
      <span className="text-slate-500 text-xs">
        {new Date(val).toLocaleString()}
      </span>
    )},
    { header: "Tx Hash", accessor: "transactionHash", render: (val) => (
      <span className="font-mono text-[10px] text-slate-400 select-all" title={val}>
        {val ? `${val.substring(0, 10)}...` : ""}
      </span>
    )}
  ];

  if (loading) return <LoadingSpinner message="Querying administrative metrics and block records..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy">Overview</h2>
          <p className="text-sm text-slate-500">Live operational stats synced with the decentralized registry.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetCycle}
            disabled={resetting}
            className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
          >
            {resetting ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Resetting Cycle...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Reset Monthly Cycle
              </>
            )}
          </button>
          
          <button
            onClick={fetchData}
            disabled={resetting}
            className="bg-navy text-white px-4 py-2 text-xs font-semibold rounded hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}
      {successMsg && <SuccessMessage message={successMsg} txHash={successTxHash} />}

      {/* Stats aggregates grid row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          title="Central Warehouse Stock"
          value={stats?.warehouseStock !== undefined ? `${stats.warehouseStock} kg` : "0 kg"}
          color="amber"
          icon={<span className="material-symbols-outlined text-[24px]">warehouse</span>}
        />
        <StatCard
          title="Registered Dealers"
          value={stats?.totalDealers ?? 0}
          color="navy"
          icon={<span className="material-symbols-outlined text-[24px]">store</span>}
        />
        <StatCard
          title="Registered Beneficiaries"
          value={stats?.totalBeneficiaries ?? 0}
          color="indigo"
          icon={<span className="material-symbols-outlined text-[24px]">group</span>}
        />
        <StatCard
          title="Blockchain Grain Transfers"
          value={stats?.totalTransfers ?? 0}
          color="rose"
          icon={<span className="material-symbols-outlined text-[24px]">local_shipping</span>}
        />
        <StatCard
          title="Total Distributions"
          value={stats?.totalDistributions ?? 0}
          color="emerald"
          icon={<span className="material-symbols-outlined text-[24px]">verified</span>}
        />
      </div>

      {/* Recent blockchain activities */}
      <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-navy">Recent Blockchain Transactions</h3>
          <p className="text-xs text-slate-500">The 5 most recent records verified by block confirmations.</p>
        </div>
        <DataTable
          columns={columns}
          data={recentTx}
          emptyMessage="No blockchain transactions recorded yet"
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
