import { useEffect, useState } from "react";
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
          type="button"
          onClick={copyHash}
          className="text-navy hover:text-navy-light text-xs font-sans font-bold hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
};

/**
 * MyReceipts component.
 * Lists all historical and verified distribution receipts corresponding to the citizen's ration card.
 * Provides authorized one-click official PDF receipt downloads for verified distributions.
 */
const MyReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchReceipts = async () => {
      try {
        const res = await API.get("/api/beneficiary/receipts");
        if (isMounted) {
          setReceipts(res.data.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[BENEFICIARY RECEIPTS FETCH ERROR]", err);
          setError("Failed to load blockchain digital receipts.");
          setLoading(false);
        }
      }
    };

    fetchReceipts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownloadPdf = async (receiptId) => {
    if (!receiptId) return;
    setDownloadingId(receiptId);
    setDownloadError("");

    try {
      const res = await API.get(`/api/beneficiary/receipt/${receiptId}/pdf`, {
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${receiptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[BENEFICIARY PDF DOWNLOAD ERROR]", err);
      setDownloadError("Failed to download PDF receipt. Please check server connection.");
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    {
      header: "Receipt ID / Type",
      accessor: "receiptId",
      render: (val, row) => (
        <div>
          {row.hasPdf && val ? (
            <div>
              <span className="font-bold text-navy text-xs block">{val}</span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                Verified On-Chain
              </span>
            </div>
          ) : (
            <div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-250 block w-fit">
                Ration Collected
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                Historical Record
              </span>
            </div>
          )}
        </div>
      )
    },
    {
      header: "Commodity & Period",
      accessor: "commodity",
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">
            {val || "Food Grains (Wheat / Rice)"}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Cycle: {row.distributionMonth || "Current Cycle"}
          </span>
        </div>
      )
    },
    {
      header: "Quantity Issued",
      accessor: "quantity",
      render: (val) => <span className="font-bold text-navy text-sm">{val} kg</span>
    },
    {
      header: "Collection Date",
      accessor: "timestamp",
      render: (val) => (
        <span className="text-slate-600 text-xs">
          {new Date(val).toLocaleString()}
        </span>
      )
    },
    {
      header: "Distribution Center",
      accessor: "fpsShopId",
      render: (val, row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-700 block">
            {row.dealerName || "Fair Price Shop"}
          </span>
          <span className="text-slate-400 font-mono text-[11px] block">
            {val ? `ID: ${val}` : (row.dealerLocation || "Authorized Center")}
          </span>
        </div>
      )
    },
    {
      header: "Cryptographic Proof (Tx Hash)",
      accessor: "transactionHash",
      render: (val) => <CopyableHashCell value={val} />
    },
    {
      header: "Official Receipt",
      accessor: "hasPdf",
      render: (hasPdf, row) => {
        if (hasPdf && row.receiptId) {
          const isDownloading = downloadingId === row.receiptId;
          return (
            <button
              type="button"
              onClick={() => handleDownloadPdf(row.receiptId)}
              disabled={isDownloading}
              className="h-8 px-3 bg-navy text-white text-[11px] font-bold rounded hover:bg-navy-light transition-all flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-60 shadow-sm shrink-0"
              title="Download official verifiable PDF receipt"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download PDF</span>
                </>
              )}
            </button>
          );
        }

        return (
          <span 
            className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block cursor-help font-medium"
            title="PDF receipt not available for this historical transaction (collected prior to digital receipt activation)."
          >
            PDF N/A (Historical)
          </span>
        );
      }
    }
  ];

  if (loading) return <LoadingSpinner message="Retrieving digital receipts and blockchain ledger logs..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">My Digital Receipts</h2>
        <p className="text-sm text-slate-500">
          A list of all grains collected by your ration card. Download official PDF receipts with blockchain audit proofs.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}
      {downloadError && <ErrorMessage message={downloadError} />}

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
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
