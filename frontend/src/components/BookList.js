import React from 'react';
import SeriesGroup from './SeriesGroup';

const BookList = ({ seriesGroups, loading, error }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-xl">Loading books...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!seriesGroups || seriesGroups.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400 text-xl">No books found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {seriesGroups.map((group, index) => (
        <SeriesGroup key={`${group.series_name}-${index}`} series={group} />
      ))}
    </div>
  );
};

export default BookList;