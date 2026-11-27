import React, { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import API from "../../services/api";

const ViewDistributions = () => {
  const [distributions, setDistributions] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [copiedTx, setCopiedTx] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/api/dealer/distributions");
      if (res.data.success) {
        const data = res.data.data;
        setDistributions(data);
        setFilteredData(data);

        // Extract unique months for the dropdown filter
        const monthsSet = new Set();
        data.forEach((item) => {
          if (item.month && item.year) {
            monthsSet.add(`${item.month} ${item.year}`);
          }
        });
        setAvailableMonths(Array.from(monthsSet));
      } else {
        setError(res.data.message || "Failed to load distribution history.");
      }
    } catch (err) {
      console.error("[DEALER DISTRIBUTIONS VIEW ERROR]", err);
      setError("Failed to query transaction log from the blockchain. Make sure Ganache is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMonth === "") {
      setFilteredData(distributions);
    } else {
      const filtered = distributions.filter((item) => {
        const itemMonthYear = `${item.month} ${item.year}`;
        return itemMonthYear === selectedMonth;
      });
      setFilteredData(filtered);
    }
  }, [selectedMonth, distributions]);

  const handleCopyHash = (txHash) => {
    navigator.clipboard.writeText(txHash);
    setCopiedTx(txHash);
    setTimeout(() => setCopiedTx(""), 2000);
  };

  const columns = [
    {
      header: "Beneficiary Name",
      accessor: "name",
      render: (val, row) => (
        <div>
          <p className="font-bold text-slate-900">{val}</p>
          <p className="text-xs text-slate-500 font-mono">Card: {row.rationCardNumber}</p>
        </div>
      ),
    },
    {
      header: "Wallet Address",
      accessor: "beneficiaryAddress",
      render: (val) => (
        <span className="font-mono text-xs text-slate-650" title={val}>
          {val ? `${val.substring(0, 8)}...${val.substring(val.length - 6)}` : "N/A"}
        </span>
      ),
    },
    {
      header: "Quantity Distributed",
      accessor: "quantity",
      render: (val) => <span className="font-bold text-navy">{val} kg</span>,
    },
    {
      header: "Cycle Month",
      accessor: "month",
      render: (val, row) => (
        <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          {val} {row.year}
        </span>
      ),
    },
    {
      header: "Timestamp",
      accessor: "timestamp",
      render: (val) => <span className="text-xs text-slate-500">{new Date(val).toLocaleString()}</span>,
    },
    {
      header: "Tx Hash",
      accessor: "transactionHash",
      render: (val) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400 select-all" title={val}>
            {val ? `${val.substring(0, 8)}...` : ""}
          </span>
          {val && (
            <button
              onClick={() => handleCopyHash(val)}
              className="text-navy hover:text-navy-light text-xs font-semibold focus:outline-none"
            >
              {copiedTx === val ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner message="Retrieving transaction ledger from blockchain..." />;

  const totalQuantity = filteredData.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy">Distribution History</h2>
          <p className="text-sm text-slate-500">
            Blockchain-verified logs of all grain rations distributed to registered cardholders.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="bg-navy text-white px-4 py-2 text-xs font-semibold rounded hover:bg-navy-light transition-all flex items-center gap-1.5 shadow-sm self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
          Refresh Log
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Filter and stats row */}
      <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="w-full md:w-72">
          <label htmlFor="monthFilter" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Filter by Month Cycle
          </label>
          <select
            id="monthFilter"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-slate-50 border border-slate-250 rounded px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:border-navy"
          >
            <option value="">All Months</option>
            {availableMonths.map((m, idx) => (
              <option key={idx} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-6 text-sm text-slate-650 bg-slate-50 p-4 rounded border border-slate-200 flex-grow md:flex-grow-0 md:w-auto">
          <div>
            <span className="block font-semibold text-slate-450 uppercase text-xs">Matching Transactions</span>
            <span className="text-xl font-bold text-slate-800">{filteredData.length} records</span>
          </div>
          <div className="border-l border-slate-250 pl-6">
            <span className="block font-semibold text-slate-450 uppercase text-xs">Total Quantity Distributed</span>
            <span className="text-xl font-bold text-navy">{totalQuantity} kg</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        emptyMessage={
          selectedMonth
            ? `No rations were distributed during the ${selectedMonth} cycle.`
            : "No ration distribution history found."
        }
      />
    </div>
  );
};

export default ViewDistributions;
