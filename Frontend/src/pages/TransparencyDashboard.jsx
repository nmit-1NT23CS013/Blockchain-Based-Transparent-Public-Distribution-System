import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import API from "../services/api";

const CopyableHashCell = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const copyHash = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
      <span className="truncate max-w-[120px]" title={value}>{value || "N/A"}</span>
      {value && (
        <button
          onClick={copyHash}
          className="text-[#1e3a5f] hover:text-[#022448] text-xs font-sans font-bold hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
};

/**
 * TransparencyDashboard component.
 * Public ledger viewer enabling citizens to search and audit blockchain records without login.
 */
const TransparencyDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("transfers");

  const loadLedgerData = async () => {
    try {
      const res = await API.get("/api/dashboard/transactions");
      setTransactions(res.data.data);
    } catch (err) {
      console.error("Public dashboard error", err);
      setError("Failed to load blockchain ledger data from server.");
    } finally {
      setLoading(false);
    }
  };

  // Poll blockchain logs every 30 seconds
  useEffect(() => {
    loadLedgerData();
    const interval = setInterval(() => {
      console.log("[POLLING] Syncing latest blockchain transactions...");
      loadLedgerData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const transfers = transactions.filter((t) => t.type === "Allocation Transfer");
  const distributions = transactions.filter((t) => t.type === "Ration Distribution");

  const transferColumns = [
    { header: "Allocation ID", accessor: "id" },
    { header: "Sender (Admin)", accessor: "actor" },
    {
      header: "Recipient (Dealer Wallet)",
      accessor: "recipient",
      render: (val) => <span className="font-mono text-xs text-slate-655">{val}</span>
    },
    {
      header: "Quantity Allocated",
      accessor: "quantity",
      render: (val) => <span className="font-bold text-slate-800">{val} kg</span>
    },
    {
      header: "Confirmation Time",
      accessor: "timestamp",
      render: (val) => <span>{new Date(val).toLocaleString()}</span>
    },
    {
      header: "Transaction Proof (Tx Hash)",
      accessor: "transactionHash",
      render: (val) => <CopyableHashCell value={val} />
    }
  ];

  const distributionColumns = [
    { header: "Distribution ID", accessor: "id" },
    { header: "Authorized Dealer", accessor: "actor" },
    {
      header: "Beneficiary Cardholder",
      accessor: "recipient",
      render: (val) => <span className="font-mono text-xs text-slate-655">{val}</span>
    },
    {
      header: "Quantity Issued",
      accessor: "quantity",
      render: (val) => <span className="font-bold text-slate-800">{val} kg</span>
    },
    {
      header: "Collection Date",
      accessor: "timestamp",
      render: (val) => <span>{new Date(val).toLocaleString()}</span>
    },
    {
      header: "Verification Proof (Tx Hash)",
      accessor: "transactionHash",
      render: (val) => <CopyableHashCell value={val} />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb] text-[#191c1e]">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-10 space-y-6">
        {/* Title / Hero Header */}
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold text-navy">PDS Blockchain Transparency Portal</h2>
          <p className="text-sm text-slate-500 mt-1">
            All food grain transfers and distribution receipts are written immutably to the decentralized Ethereum ledger.
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("transfers")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "transfers"
                ? "border-navy text-navy"
                : "border-transparent text-slate-450 hover:text-navy hover:border-slate-300"
            }`}
          >
            Central Allocation Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab("distributions")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "distributions"
                ? "border-navy text-navy"
                : "border-transparent text-slate-450 hover:text-navy hover:border-slate-300"
            }`}
          >
            Dealer Grains Distributions ({distributions.length})
          </button>
        </div>

        {/* Tab Content Tables */}
        {loading ? (
          <LoadingSpinner message="Auditing public transaction history on-chain..." />
        ) : (
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            {activeTab === "transfers" ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Admin to Dealer Grain Transfers</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Physical grain consignments verified on-chain.</p>
                </div>
                <DataTable
                  columns={transferColumns}
                  data={transfers}
                  emptyMessage="No central allocation transfer records found."
                />
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Dealer to Citizen Ration Distributions</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Rations claimed by citizens, preventing double-claiming.</p>
                </div>
                <DataTable
                  columns={distributionColumns}
                  data={distributions}
                  emptyMessage="No ration distribution logs found."
                />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>PDS Blockchain Registry Network • National Transparency Portal</p>
        <p className="mt-1 text-[10px] text-slate-400">Live data polling active (updates every 30s)</p>
      </footer>
    </div>
  );
};

export default TransparencyDashboard;
