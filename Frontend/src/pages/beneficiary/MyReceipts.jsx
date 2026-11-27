import React, { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

/**
 * MyReceipts component.
 * Lists all on-chain collection logs corresponding to the citizen's wallet.
 */
const MyReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/beneficiary/receipts");
      setReceipts(res.data.data);
    } catch (err) {
      console.error("[BENEFICIARY RECEIPTS FETCH ERROR]", err);
      setError("Failed to load blockchain digital receipts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const columns = [
    {
      header: "Record Type",
      accessor: "type",
      render: () => (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
          Ration Collected
        </span>
      )
    },
    {
      header: "Quantity Issued",
      accessor: "quantity",
      render: (val) => <span className="font-bold text-slate-800">{val} kg</span>
    },
    {
      header: "Collection Date",
      accessor: "timestamp",
      render: (val) => (
        <span className="text-slate-500 text-xs">
          {new Date(val).toLocaleString()}
        </span>
      )
    },
    {
      header: "Cryptographic Proof (Transaction Hash)",
      accessor: "transactionHash",
      render: (val) => {
        const [copied, setCopied] = useState(false);
        const copyHash = () => {
          navigator.clipboard.writeText(val);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        };
        return (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span className="truncate max-w-[200px]" title={val}>{val}</span>
            <button
              onClick={copyHash}
              className="text-navy hover:text-navy-light text-xs font-sans font-bold hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        );
      }
    }
  ];

  if (loading) return <LoadingSpinner message="Retrieving digital receipts from blockchain ledger logs..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">My Digital Receipts</h2>
        <p className="text-sm text-slate-500">
          A list of all grains collected by your ration card. Every entry represents an immutable blockchain event.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <DataTable
          columns={columns}
          data={receipts}
          emptyMessage="You have not collected any ration grains in the current cycle yet."
        />
      </div>
    </div>
  );
};

export default MyReceipts;
