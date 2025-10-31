'use client';

import React from 'react';
import { Table, LoadingSpinner, EmptyState } from '../shared/components';

// Example component to demonstrate usage
export default function ComponentDemo() {
  // Test data
  const sampleData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  ];

  const tableConfig = {
    columns: [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'age', header: 'Age', sortable: true },
    ],
    data: sampleData,
    keyExtractor: (row: typeof sampleData[0]) => row.id.toString(),
    searchable: true,
    sortable: true,
    emptyTitle: 'No Users Found',
    emptyText: 'There are no users to display at this time.',
    emptyIcon: '👥',
  };

  const loadingTableConfig = {
    ...tableConfig,
    data: [],
    loading: true,
    loadingText: 'Loading users...',
  };

  const emptyTableConfig = {
    ...tableConfig,
    data: [],
    loading: false,
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Component Demo
      </h1>
      
      {/* Table with data */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Table with Data
        </h2>
        <Table config={tableConfig} />
      </div>

      {/* Table loading state */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Table Loading State
        </h2>
        <Table config={loadingTableConfig} />
      </div>

      {/* Table empty state */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Table Empty State
        </h2>
        <Table config={emptyTableConfig} />
      </div>

      {/* Standalone LoadingSpinner */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Standalone Loading Spinner
        </h2>
        <LoadingSpinner 
          config={{
            size: 'large',
            variant: 'primary',
            text: 'Processing your request...',
            showText: true,
          }}
        />
      </div>

      {/* Standalone EmptyState */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Standalone Empty State
        </h2>
        <EmptyState
          icon="🔍"
          title="No search results"
          description="We couldn't find any items matching your search criteria."
          size="medium"
          variant="search"
          actions={[
            {
              label: 'Clear Search',
              onClick: () => alert('Clear search clicked'),
              variant: 'outline',
            },
            {
              label: 'Browse All',
              onClick: () => alert('Browse all clicked'),
              variant: 'primary',
            },
          ]}
        />
      </div>
    </div>
  );
}