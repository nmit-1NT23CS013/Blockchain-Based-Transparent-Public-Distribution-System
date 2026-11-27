import React from "react";

/**
 * Reusable data table component.
 * @param {Array} columns Configuration list containing { header: string, accessor: string, render: function(value, row) }
 * @param {Array} data Data records to populate the table rows
 * @param {string} emptyMessage Warning text to show when table list is empty
 */
const DataTable = ({ columns, data, emptyMessage = "No records found matching criteria" }) => {
  return (
    <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-150 text-sm text-slate-700">
          {data && data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[#f7f9fb]/50 transition-colors">
                {columns.map((col, colIndex) => {
                  const val = row[col.accessor];
                  return (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                      {col.render ? col.render(val, row) : val !== undefined && val !== null ? val.toString() : ""}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-10 text-center text-slate-400 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
