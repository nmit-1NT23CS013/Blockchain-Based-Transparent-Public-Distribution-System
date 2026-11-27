import React from "react";

/**
 * Centered spinner for loading screens and asynchronous operations.
 */
const LoadingSpinner = ({ message = "Accessing secure blockchain ledger..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy mb-4"></div>
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
