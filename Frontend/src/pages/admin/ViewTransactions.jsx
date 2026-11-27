import React, { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

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
          className="text-navy hover:text-[#022448] text-xs font-sans font-bold hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
};

/**
 * ViewTransactions component.
 * Admin view loading all on-chain allocation transfers and distributions.
 */
const ViewTransactions = () => {
  const [allTx, setAllTx] = useState([]);
  const [filteredTx, setFilteredTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/dashboard/transactions");
      setAllTx(res.data.data);
      setFilteredTx(res.data.data);
    } catch (err) {
      console.error("View transactions error", err);
      setError("Failed to fetch blockchain ledger transaction list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleFilterChange = (e) => {
    const val = e.target.value;
    setFilterType(val);
    if (val === "all") {
      setFilteredTx(allTx);
    } else {
      setFilteredTx(allTx.filter((t) => t.type === val));
    }
  };

  const columns = [
    {
      header: "Type",
      accessor: "type",
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          val === "Allocation Transfer" 
            ? "bg-blue-50 text-blue-700 border border-blue-200" 
            : "bg-emerald-50 text-emerald-700 border border-emerald-250"
        }`}>
          {val}
        </span>
      )
    },
    {
      header: "Sender (From)",
      accessor: "actor",
      render: (val) => (
        <span className="font-semibold text-slate-700" title={val}>
          {val}
        </span>
      )
    },
    {
      header: "Recipient (To)",
      accessor: "recipient",
      render: (val) => (
        <span className="font-mono text-xs text-slate-600" title={val}>
          {val ? `${val.substring(0, 10)}...${val.substring(val.length - 8)}` : "N/A"}
        </span>
      )
    },
    {
      header: "Quantity",
      accessor: "quantity",
      render: (val) => <span className="font-bold text-slate-900">{val} kg</span>
    },
    {
      header: "Timestamp",
      accessor: "timestamp",
      render: (val) => (
        <span className="text-xs text-slate-500">
          {new Date(val).toLocaleString()}
        </span>
      )
    },
    {
      header: "Transaction Block Hash",
      accessor: "transactionHash",
      render: (val) => <CopyableHashCell value={val} />
    }
  ];

  if (loading) return <LoadingSpinner message="Querying all confirmed block event logs..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy">Public Ledger Audit Logs</h2>
          <p className="text-sm text-slate-500">
            Audit-grade list of all grain allocations and distributions recorded on the blockchain network.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <label htmlFor="filterType" className="text-xs font-bold text-slate-400 uppercase shrink-0">
            Filter Ledger:
          </label>
          <select
            id="filterType"
            className="h-10 px-3 bg-white border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy outline-none text-slate-700 text-sm font-semibold shadow-sm"
            value={filterType}
            onChange={handleFilterChange}
          >
            <option value="all">Show All Operations</option>
            <option value="Allocation Transfer">Allocation Transfers (Admin)</option>
            <option value="Ration Distribution">Ration Distributions (Dealer)</option>
          </select>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredTx}
          emptyMessage="No blockchain transactions matched this criteria"
        />
      </div>
    </div>
  );
};

export default ViewTransactions;
