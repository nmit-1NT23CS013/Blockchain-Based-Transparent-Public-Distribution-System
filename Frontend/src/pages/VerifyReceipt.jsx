import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";
import API from "../services/api";

const CopyableText = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors ml-2"
      title="Copy to clipboard"
    >
      <span>{copied ? "Copied!" : label}</span>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {copied ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        )}
      </svg>
    </button>
  );
};

const VerifyReceipt = () => {
  const { receiptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchVerification = async () => {
      if (!receiptId) {
        setErrorStatus("INVALID_URL");
        setErrorMessage("No receipt identifier provided in the URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorStatus(null);
      setErrorMessage("");

      try {
        const response = await API.get(`/api/dashboard/verify-receipt/${encodeURIComponent(receiptId.trim())}`);
        setVerificationResult(response.data);
      } catch (err) {
        console.error("Public verification API error", err);
        const data = err.response?.data;
        if (err.response?.status === 404) {
          setErrorStatus("NOT_FOUND");
          setErrorMessage(data?.message || `Receipt '${receiptId}' not found in the official PDS registry.`);
        } else if (err.response?.status === 429) {
          setErrorStatus("RATE_LIMITED");
          setErrorMessage(data?.message || "Too many verification requests. Please try again shortly.");
        } else if (err.response?.status === 400) {
          setErrorStatus("INVALID_ID");
          setErrorMessage(data?.message || "Invalid receipt ID format.");
        } else {
          setErrorStatus("SERVER_ERROR");
          setErrorMessage(data?.message || "Failed to reach verification service. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [receiptId]);

  const result = verificationResult?.data;
  const isVerified = verificationResult?.verified === true;
  const status = verificationResult?.status;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6">
        {/* Breadcrumb / Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link to="/" className="hover:text-navy transition-colors">Home</Link>
            <span>/</span>
            <Link to="/transparency" className="hover:text-navy transition-colors">Transparency Portal</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Verify Receipt</span>
          </div>

          <Link
            to="/transparency"
            className="text-xs font-semibold text-navy hover:underline inline-flex items-center gap-1"
          >
            <span>Public Ledger</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <LoadingSpinner />
            <h2 className="text-lg font-bold text-slate-800 mt-4">Verifying Blockchain Record</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Querying distributed smart contract on Ethereum ledger and matching cryptographic signatures...
            </p>
          </div>
        )}

        {/* 404 OR HARD ERROR STATE */}
        {!loading && errorStatus && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 sm:p-10 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
              Verification Failed
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Receipt Not Verified</h1>
            <p className="text-slate-600 text-sm mt-2 max-w-lg mx-auto">
              {errorMessage}
            </p>
            <p className="text-xs text-slate-400 mt-4">
              Identifier Checked: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">{receiptId}</code>
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/transparency"
                className="bg-navy hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Browse Public Ledger
              </Link>
            </div>
          </div>
        )}

        {/* VERIFICATION RESPONSE CARD */}
        {!loading && !errorStatus && verificationResult && (
          <div className="space-y-6">
            {/* Top Verification Status Banner */}
            {isVerified ? (
              <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-xl p-6 sm:p-8 shadow-md border-b-4 border-emerald-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-400/20 text-emerald-200 rounded text-[11px] font-bold uppercase tracking-wider mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Blockchain Record Verified
                      </div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                        Blockchain Record Verified
                      </h1>
                      <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">
                        This ration distribution record is cryptographically verified against the smart contract ledger (<code className="font-mono text-emerald-200">ReceiptManager.sol</code>).
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/20 text-right self-stretch sm:self-auto">
                    <span className="text-[10px] text-emerald-200 block uppercase font-bold tracking-wider">Blockchain Receipt ID</span>
                    <span className="text-xl font-mono font-bold">#{result?.blockchainReceiptId || "N/A"}</span>
                  </div>
                </div>
              </div>
            ) : status === "BLOCKCHAIN_UNAVAILABLE" ? (
              <div className="bg-amber-900 text-white rounded-xl p-6 sm:p-8 shadow-md border-b-4 border-amber-500">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-500/20 border border-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-amber-400/20 text-amber-200 rounded text-[11px] font-bold uppercase tracking-wider mb-1">
                      Blockchain Node Unavailable
                    </span>
                    <h1 className="text-xl font-bold">Network Connectivity Notice</h1>
                    <p className="text-xs sm:text-sm text-amber-100 mt-1">
                      Receipt metadata is registered in the database, but the Ethereum blockchain RPC node is currently unreachable.
                      Cryptographic confirmation cannot be completed until the node re-establishes connectivity.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-900 text-white rounded-xl p-6 sm:p-8 shadow-md border-b-4 border-red-500">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500/20 border border-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-red-400/20 text-red-200 rounded text-[11px] font-bold uppercase tracking-wider mb-1">
                      Integrity Check Failed
                    </span>
                    <h1 className="text-xl font-bold">Discrepancy Detected</h1>
                    <p className="text-xs sm:text-sm text-red-100 mt-1">
                      {verificationResult.message}
                    </p>
                    {verificationResult.discrepancies && (
                      <ul className="mt-2 list-disc list-inside text-xs text-red-200 space-y-1">
                        {verificationResult.discrepancies.map((d, idx) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Receipt Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Official Receipt Number</span>
                  <span className="font-mono text-base font-bold text-navy">{result?.receiptId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Distribution Month</span>
                  <span className="text-sm font-semibold text-slate-800">{result?.distributionMonth}</span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Beneficiary Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Beneficiary Citizen Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cardholder Name:</span>
                      <span className="font-semibold text-slate-900">{result?.maskedBeneficiaryName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ration Card Number:</span>
                      <span className="font-mono font-semibold text-slate-900">{result?.maskedRationCardNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Privacy Status:</span>
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        PII Masked &amp; Protected
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fair Price Shop Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Fair Price Shop (FPS) Dealer
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dealer / Shop Name:</span>
                      <span className="font-semibold text-slate-900">{result?.dealerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">FPS Shop ID:</span>
                      <span className="font-mono font-semibold text-slate-900">{result?.fpsShopId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shop Location:</span>
                      <span className="text-slate-900">{result?.dealerLocation}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commodity Issued Details */}
              <div className="px-6 py-4 bg-slate-50/75 border-t border-b border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Commodity Dispatched</span>
                    <span className="text-base font-bold text-slate-900">{result?.commodity}</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Quantity Issued</span>
                    <span className="text-2xl font-black text-navy">{result?.quantity} {result?.unit || "kg"}</span>
                  </div>
                </div>
              </div>

              {/* Blockchain Cryptographic Proof Section */}
              <div className="p-6 bg-slate-900 text-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Ethereum Blockchain Verification Proof
                  </h3>
                  <span className="text-[10px] font-mono bg-slate-800 text-emerald-300 px-2 py-0.5 rounded border border-slate-700">
                    Smart Contract: ReceiptManager
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Confirmed Transaction Reference (Hash):</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-100 break-all select-all">{result?.transactionHash}</span>
                      <CopyableText text={result?.transactionHash} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Contract Address:</span>
                      <span className="text-slate-200 break-all">{result?.contractAddress}</span>
                    </div>
                    {result?.blockNumber && (
                      <div>
                        <span className="text-slate-400 text-[11px] block">Mined Block Number:</span>
                        <span className="text-slate-200">#{result?.blockNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span>Verified At: {new Date(result?.verificationTimestamp).toLocaleString()}</span>
                    <span className="text-emerald-400">Status: {result?.verificationStatus || "Verified"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Demonstration Disclaimer */}
            <div className="text-center text-xs text-slate-500 py-4 space-y-1">
              <p className="font-semibold text-slate-700">
                PDS TrustLink &mdash; Blockchain-Powered Public Distribution System (Academic Project Demonstration)
              </p>
              <p className="text-slate-400 max-w-xl mx-auto">
                This verification portal validates distribution receipts directly against the deployed Ethereum smart contract. It serves as an academic project prototype and does not represent an officially certified government agency portal.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VerifyReceipt;
