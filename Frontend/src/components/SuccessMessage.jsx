import React, { useState } from "react";

/**
 * Custom success notification card. Shows success text and copyable transaction hash block.
 */
const SuccessMessage = ({ message, txHash }) => {
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const handleCopy = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-start gap-3 text-sm my-4 shadow-sm">
      <svg
        className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="flex-grow min-w-0">
        <h4 className="font-bold text-emerald-800">Transaction Confirmed</h4>
        <p className="mt-0.5 opacity-95">{message}</p>
        {txHash && (
          <div className="mt-2.5 p-2 bg-[#d1fae5]/70 rounded border border-[#a7f3d0] flex items-center justify-between font-mono text-[11px] text-[#065f46]">
            <span className="truncate mr-2">Tx Hash: {txHash}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[#047857] hover:text-[#065f46] font-sans font-bold hover:underline shrink-0 text-xs"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessMessage;
