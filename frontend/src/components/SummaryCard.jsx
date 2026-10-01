import React from 'react';

const SummaryCard = ({ title, value, className = '' }) => {
  return (
    <div className={`bg-white shadow rounded p-4 ${className}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
};

export default SummaryCard;
