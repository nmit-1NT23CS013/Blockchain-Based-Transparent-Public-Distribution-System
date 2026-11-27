import React, { useEffect, useState } from "react";
import SuccessMessage from "../../components/SuccessMessage";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import API from "../../services/api";

/**
 * TransferGrain component.
 * Allows PDS Administrators to select a dealer, input stock quantity, and execute a blockchain grain transfer.
 */
const TransferGrain = () => {
  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [warehouseStock, setWarehouseStock] = useState(null);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const fetchDealersAndStock = async () => {
    try {
      setLoadingDealers(true);
      const [dealersRes, statsRes] = await Promise.all([
        API.get("/api/admin/dealers"),
        API.get("/api/admin/stats")
      ]);
      setDealers(dealersRes.data.data);
      setWarehouseStock(statsRes.data.data.warehouseStock);
    } catch (err) {
      console.error("Failed to load dealers dropdown or stock stats", err);
      setError("Unable to retrieve dealer lists or warehouse stock details.");
    } finally {
      setLoadingDealers(false);
    }
  };

  useEffect(() => {
    fetchDealersAndStock();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDealerId || !quantity) return;

    setSubmitting(true);
    setSuccess("");
    setTxHash("");
    setError("");

    try {
      const res = await API.post("/api/admin/transfer", {
        dealerId: selectedDealerId,
        quantity: Number(quantity)
      });
      
      const { quantityTransferred, fpsShopId, transactionHash, warehouseStock: newStock } = res.data.data;
      const dealerName = dealers.find(d => d._id === selectedDealerId)?.userId?.name || "Dealer";
      
      setSuccess(`Successfully transferred ${quantityTransferred} kg of grain to Dealer '${dealerName}' (${fpsShopId}) on-chain.`);
      setTxHash(transactionHash);
      if (newStock !== undefined) {
        setWarehouseStock(newStock);
      }
      setQuantity("");
      setSelectedDealerId("");
    } catch (err) {
      console.error("[GRAIN TRANSFER ERROR]", err);
      setError(
        err.response?.data?.message || 
        "Failed to complete grain transfer. Check blockchain connection."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDealers) return <LoadingSpinner message="Fetching licensed dealer profiles for stock transfer..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy">Transfer Grain to Dealer</h2>
          <p className="text-sm text-slate-500">
            Allocate central storage grain stock to a Fair Price Shop Dealer. Creates an immutable transaction on the blockchain ledger.
          </p>
        </div>
        {warehouseStock !== null && (
          <div className="shrink-0 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-4 py-2 shadow-sm">
            Warehouse Stock: <span className="font-bold text-base">{warehouseStock}</span> kg
          </div>
        )}
      </div>

      {success && <SuccessMessage message={success} txHash={txHash} />}
      {error && <ErrorMessage message={error} />}

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Dealer Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 px-1" htmlFor="selectedDealerId">
              Select Destination Dealer / FPS Shop
            </label>
            <select
              id="selectedDealerId"
              className="w-full h-11 px-3 bg-white border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy outline-none text-slate-700 text-sm font-semibold shadow-sm"
              value={selectedDealerId}
              onChange={(e) => setSelectedDealerId(e.target.value)}
              required
            >
              <option value="">-- Select Dealer Shop --</option>
              {dealers.map((dealer) => (
                <option key={dealer._id} value={dealer._id}>
                  {dealer.userId?.name || "Dealer"} - {dealer.fpsShopId} ({dealer.location})
                </option>
              ))}
            </select>
          </div>

          {/* Grain Quantity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 px-1" htmlFor="quantity">
              Grain Quantity to Allocate (kg)
            </label>
            <div className="relative max-w-[245px]">
              <input
                type="number"
                id="quantity"
                className="w-full h-11 px-3 pr-8 bg-transparent border border-slate-300 rounded focus:border-navy focus:ring-1 focus:ring-navy transition-all outline-none text-slate-800 text-sm"
                placeholder="500"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">kg</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium px-1">
              * The quantity will be added directly to the dealer's current inventory stock levels.
            </p>
          </div>

          {/* Action submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-6 bg-navy text-white rounded font-semibold text-sm hover:bg-navy-light transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing Blockchain Write...</span>
              </>
            ) : (
              <span>Initiate Grain Transfer</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransferGrain;
