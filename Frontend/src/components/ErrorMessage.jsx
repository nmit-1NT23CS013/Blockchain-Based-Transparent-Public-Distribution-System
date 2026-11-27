import React from "react";

/**
 * Custom error alert container with icons.
 */
const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-3 text-sm my-4 shadow-sm">
      <svg
        className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <h4 className="font-bold text-red-800">Operation Rejected</h4>
        <p className="mt-0.5 opacity-90">{message}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
