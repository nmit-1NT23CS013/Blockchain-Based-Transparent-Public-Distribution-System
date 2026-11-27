import React from "react";

/**
 * Reusable Metric card to show dashboard statistics.
 * @param {string} title Stat name
 * @param {string|number} value Primary value to display
 * @param {React.ReactNode} icon Icon element
 * @param {string} color Theme color key ('navy', 'emerald', 'amber', 'rose', 'indigo')
 */
const StatCard = ({ title, value, icon, color }) => {
  const colorMap = {
    navy: "border-navy text-navy bg-slate-100",
    emerald: "border-emerald-500 text-emerald-700 bg-emerald-50",
    amber: "border-amber-500 text-amber-700 bg-amber-50",
    rose: "border-rose-500 text-rose-700 bg-rose-50",
    indigo: "border-indigo-500 text-indigo-700 bg-indigo-50"
  };

  const styleClass = colorMap[color] || colorMap["navy"];
  const borderClass = styleClass.split(" ")[0];
  const textIconClass = styleClass.split(" ").slice(1).join(" ");

  return (
    <div className={`bg-white p-6 border-l-4 rounded-r-lg shadow-sm flex items-center justify-between border border-slate-200 ${borderClass}`}>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          {title}
        </h3>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${textIconClass}`}>
        {icon}
      </div>
    </div>
  );
};

export default StatCard;
