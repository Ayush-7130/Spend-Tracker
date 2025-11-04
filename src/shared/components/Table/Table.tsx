'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TableConfig, TableColumn, TableSort } from './config';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import EmptyState from '../EmptyState/EmptyState';

interface TableProps<T = any> {
  config: TableConfig<T>;
  className?: string;
}

export default function Table<T = any>({ config, className = '' }: TableProps<T>) {
  const [currentSort, setCurrentSort] = useState<TableSort | null>(config.defaultSort || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(config.pagination?.page || 1);
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  // Sync currentPage with config.pagination.page for server-side pagination
  useEffect(() => {
    if (config.pagination?.page) {
      setCurrentPage(config.pagination.page);
    }
  }, [config.pagination?.page]);
  // Helper function to get nested object values
  const getNestedValue = useCallback((obj: any, path: string | keyof T): any => {
    return String(path).split('.').reduce((o, p) => o?.[p], obj);
  }, []);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...config.data];

    // Apply search
    if (config.searchable && searchQuery) {
      result = result.filter(row => 
        config.columns.some(column => {
          const value = getNestedValue(row, column.accessor || column.key);
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply filters
    if (config.filterable && Object.keys(currentFilters).length > 0) {
      result = result.filter(row => {
        return Object.entries(currentFilters).every(([key, value]) => {
          if (!value) return true;
          const rowValue = getNestedValue(row, key);
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        });
      });
    }

    // Apply sorting
    if (currentSort) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, currentSort.column);
        const bValue = getNestedValue(b, currentSort.column);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return currentSort.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [config.data, config.columns, searchQuery, currentFilters, currentSort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pagination
  const paginatedData = useMemo(() => {
    if (!config.paginated || !config.pagination) return processedData;
    
    // If server-side pagination (total from server is greater than data length)
    // Don't slice - the server already sent the right page
    if (config.pagination.total && config.pagination.total > config.data.length) {
      return processedData;
    }
    
    // Client-side pagination - slice the data
    const start = (currentPage - 1) * config.pagination.limit;
    const end = start + config.pagination.limit;
    return processedData.slice(start, end);
  }, [processedData, currentPage, config.paginated, config.pagination, config.data.length]);

  // Calculate actual total based on processed data or server-provided total
  // If config.pagination.total is provided and matches or exceeds data length, use it (server-side pagination)
  // Otherwise use processedData.length (client-side pagination with filtering)
  const actualTotal = useMemo(() => {
    if (!config.pagination) return processedData.length;
    
    // If server provides total and it's greater than current data, it's server-side pagination
    if (config.pagination.total && config.pagination.total >= config.data.length) {
      return config.pagination.total;
    }
    
    // Otherwise, use processed data length for client-side filtering
    return processedData.length;
  }, [config.pagination, config.data.length, processedData.length]);
  
  const actualPages = config.pagination ? Math.ceil(actualTotal / config.pagination.limit) : 1;

  // Handle sort
  const handleSort = useCallback((column: string) => {
    if (!config.sortable) return;
    
    const newSort: TableSort = {
      column,
      direction: currentSort?.column === column && currentSort?.direction === 'asc' ? 'desc' : 'asc'
    };
    
    setCurrentSort(newSort);
    config.onSort?.(newSort);
  }, [currentSort, config]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    config.onSearch?.(query);
  }, [config]);

  // Handle filter
  const handleFilter = useCallback((key: string, value: any) => {
    const newFilters = { ...currentFilters, [key]: value };
    setCurrentFilters(newFilters);
    setCurrentPage(1);
    config.onFilter?.(newFilters);
  }, [currentFilters, config]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    config.onPageChange?.(page);
  }, [config]);

  // Handle selection
  const handleRowSelect = useCallback((row: T, selected: boolean) => {
    if (!config.selection) return;
    
    const rowId = config.keyExtractor(row);
    const currentSelected = config.selection.selectedRows;
    
    let newSelected;
    if (selected) {
      newSelected = [...currentSelected, row];
    } else {
      newSelected = currentSelected.filter(r => config.keyExtractor(r) !== rowId);
    }
    
    config.selection.onSelectionChange(newSelected);
  }, [config]);

  // Handle row expansion
  const handleRowExpand = useCallback((rowId: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
    config.onRowExpand?.(rowId, newExpanded.has(rowId));
  }, [expandedRows, config]);

  // Render cell content
  const renderCell = useCallback((column: TableColumn<T>, row: T, index: number) => {
    if (column.render) {
      return column.render(getNestedValue(row, column.accessor || column.key), row, index);
    }
    return getNestedValue(row, column.accessor || column.key);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render loading state
  if (config.loading) {
    return (
      <div className={`card ${className}`}>
        <div className="card-body text-center py-5">
          <LoadingSpinner 
            config={{
              text: config.loadingText || 'Loading...',
              size: 'medium',
              variant: 'primary',
            }}
          />
        </div>
      </div>
    );
  }

  // Render empty state
  if (processedData.length === 0) {
    return (
      <div className={`card ${className} h-100`}>
        <div className="card-body">
          <EmptyState
            icon={config.emptyIcon || '📊'}
            title={config.emptyTitle || 'No data found'}
            description={config.emptyText || 'There are no items to display.'}
            size="medium"
            variant="default"
            centered={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`card ${className}`}
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--card-shadow)'
      }}
    >
      {/* Search and Filters */}
      {(config.searchable || config.filterable) && (
        <div className="card-body border-bottom">
          <div className="row g-3">
            {config.searchable && (
              <div className="col-md-4">
                <input
                  type="text"
                  placeholder={config.searchPlaceholder || 'Search...'}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-control"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)'
                  }}
                />
              </div>
            )}
            
            {config.filterable && config.filters && config.filters.map(filter => (
              <div key={filter.key} className="col-md-3">
                {filter.type === 'select' ? (
                  <select
                    value={currentFilters[filter.key] || ''}
                    onChange={(e) => handleFilter(filter.key, e.target.value)}
                    className="form-select"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--input-text)'
                    }}
                  >
                    <option value="">{filter.placeholder || `All ${filter.label}`}</option>
                    {filter.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={filter.type}
                    placeholder={filter.placeholder || filter.label}
                    value={currentFilters[filter.key] || ''}
                    onChange={(e) => handleFilter(filter.key, e.target.value)}
                    className="form-control"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--input-text)'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {config.selection && config.bulkActions && config.selection.selectedRows.length > 0 && (
        <div 
          className="d-flex justify-content-between align-items-center p-3 border-bottom"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-secondary)'
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            {config.selection.selectedRows.length} selected
          </span>
          <div className="d-flex gap-2">
            {config.bulkActions.map(action => (
              <button
                key={action.label}
                onClick={() => action.onClick(config.selection!.selectedRows)}
                className={`btn btn-sm`}
                disabled={action.requiresSelection && config.selection!.selectedRows.length === 0}
                style={{
                  backgroundColor: action.variant === 'danger' ? 'var(--notification-error-bg)' : 'var(--btn-secondary-bg)',
                  borderColor: action.variant === 'danger' ? 'var(--notification-error-border)' : 'var(--btn-secondary-border)',
                  color: action.variant === 'danger' ? 'var(--notification-error-text)' : 'var(--btn-secondary-text)'
                }}
              >
                {action.icon && <i className={action.icon}></i>}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div 
        className={config.responsive ? 'table-responsive' : ''}
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <table 
          className={`table mb-0 ${config.hover !== false ? 'table-hover' : ''} ${config.striped ? 'table-striped' : ''} ${config.bordered ? 'table-bordered' : ''} ${config.size === 'small' ? 'table-sm' : config.size === 'large' ? 'table-lg' : ''}`}
          style={{ 
            backgroundColor: 'var(--table-bg)',
            color: 'var(--text-primary)',
            borderColor: 'var(--table-border)',
            minWidth: '100%'
          }}
        >
          <thead 
            className="table-light"
            style={{
              backgroundColor: 'var(--table-header-bg)',
              color: 'var(--table-header-text)',
              borderColor: 'var(--table-border)'
            }}
          >
            <tr>
              {config.selectable && (
                <th>
                  <input
                    type="checkbox"
                    checked={config.selection?.selectedRows.length === processedData.length}
                    onChange={(e) => {
                      if (!config.selection) return;
                      const newSelected = e.target.checked ? [...processedData] : [];
                      config.selection.onSelectionChange(newSelected);
                    }}
                  />
                </th>
              )}
              
              {config.expandable && <th></th>}
              
              {config.columns.map(column => (
                <th
                  key={column.key}
                  className={`${column.headerClassName || ''} ${column.sortable !== false && config.sortable ? 'cursor-pointer user-select-none' : ''}`}
                  style={{ width: column.width, textAlign: column.align }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  {column.header}
                  {column.sortable !== false && config.sortable && currentSort?.column === column.key && (
                    <i className={`bi ${currentSort.direction === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down'} ms-1`}></i>
                  )}
                </th>
              ))}
              
              {config.actions && <th>Actions</th>}
            </tr>
          </thead>
          
          <tbody>
            {paginatedData.map((row, index) => {
              const rowId = config.keyExtractor(row);
              const isSelected = config.selection?.selectedRows.some(r => config.keyExtractor(r) === rowId) || false;
              const isExpanded = expandedRows.has(rowId);
              const rowClass = typeof config.rowClassName === 'function' 
                ? config.rowClassName(row, index) 
                : config.rowClassName || '';
              
              return (
                <React.Fragment key={rowId}>
                  <tr 
                    className={`${rowClass} ${isSelected ? 'table-active' : ''}`}
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-active)' : (index % 2 === 0 ? 'var(--table-row-even)' : 'transparent'),
                      borderColor: 'var(--table-border)',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--table-row-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--table-row-even)' : 'transparent';
                      }
                    }}
                  >
                    {config.selectable && (
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleRowSelect(row, e.target.checked)}
                        />
                      </td>
                    )}
                    
                    {config.expandable && (
                      <td>
                        <button
                          onClick={() => handleRowExpand(rowId)}
                          className="btn btn-sm"
                          style={{
                            backgroundColor: 'var(--btn-secondary-bg)',
                            borderColor: 'var(--btn-secondary-border)',
                            color: 'var(--btn-secondary-text)',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                        </button>
                      </td>
                    )}
                    
                    {config.columns.map(column => (
                      <td
                        key={column.key}
                        className={column.className || ''}
                        style={{ 
                          textAlign: column.align,
                          color: 'var(--text-primary)',
                          borderColor: 'var(--table-border)'
                        }}
                      >
                        {renderCell(column, row, index)}
                      </td>
                    ))}
                    
                    {config.actions && (
                      <td>
                        <div className="d-flex gap-1">
                          {config.actions.map(action => {
                            if (action.hidden && action.hidden(row)) return null;
                            
                            return (
                              <button
                                key={action.label}
                                onClick={() => action.onClick(row, index)}
                                disabled={action.disabled && action.disabled(row)}
                                className={`btn btn-sm ${action.className || ''}`}
                                title={action.label}
                                style={{
                                  backgroundColor: action.variant === 'danger' 
                                    ? 'var(--notification-error-bg)' 
                                    : action.variant === 'primary'
                                    ? 'var(--btn-primary-bg)'
                                    : 'var(--btn-secondary-bg)',
                                  borderColor: action.variant === 'danger'
                                    ? 'var(--notification-error-border)'
                                    : action.variant === 'primary'
                                    ? 'var(--btn-primary-bg)'
                                    : 'var(--btn-secondary-border)',
                                  color: action.variant === 'danger'
                                    ? 'var(--notification-error-text)'
                                    : action.variant === 'primary'
                                    ? 'var(--btn-primary-text)'
                                    : 'var(--btn-secondary-text)',
                                  transition: 'var(--transition-fast)'
                                }}
                              >
                                {action.icon && <i className={action.icon}></i>}
                                {!action.icon && action.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                  
                  {/* Expanded row content */}
                  {config.expandable && isExpanded && config.getChildRows && (
                    <tr 
                      className="table-secondary"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--table-border)'
                      }}
                    >
                      <td 
                        colSpan={config.columns.length + (config.selectable ? 1 : 0) + (config.actions ? 1 : 0) + 1}
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          borderColor: 'var(--table-border)'
                        }}
                      >
                        <div className="p-3">
                          {/* Render child rows or custom content here */}
                          <Table config={{
                            ...config,
                            data: config.getChildRows(row),
                            paginated: false,
                            selectable: false,
                            expandable: false,
                          }} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {config.paginated && config.pagination && (
        <div className="table-pagination-wrapper p-3">
          <div className="table-pagination-info" style={{ color: 'var(--text-secondary)' }}>
            Showing {((currentPage - 1) * config.pagination.limit) + 1} to{' '}
            {Math.min(currentPage * config.pagination.limit, actualTotal)} of{' '}
            {actualTotal} entries
          </div>
          
          <nav className="table-pagination-nav">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="page-link page-link-prev"
                  style={{
                    backgroundColor: currentPage === 1 ? 'var(--btn-secondary-bg)' : 'var(--card-bg)',
                    borderColor: 'var(--border-primary)',
                    color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--btn-primary-bg)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <i className="bi bi-chevron-left me-1"></i>
                  <span className="d-none d-sm-inline">Previous</span>
                </button>
              </li>
            
              {/* Page numbers */}
              {config.pagination && Array.from({ length: actualPages }, (_, i) => i + 1)
                .filter(page => config.pagination && (Math.abs(page - currentPage) <= 2 || page === 1 || page === actualPages))
                .map(page => (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button
                      onClick={() => handlePageChange(page)}
                      className="page-link"
                      style={{
                        backgroundColor: currentPage === page ? 'var(--btn-primary-bg)' : 'var(--card-bg)',
                        borderColor: currentPage === page ? 'var(--btn-primary-bg)' : 'var(--border-primary)',
                        color: currentPage === page ? 'var(--btn-primary-text)' : 'var(--btn-primary-bg)',
                        transition: 'var(--transition-fast)',
                        fontWeight: currentPage === page ? '600' : '400'
                      }}
                    >
                      {page}
                    </button>
                  </li>
                ))}
              
              <li className={`page-item ${currentPage >= actualPages ? 'disabled' : ''}`}>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= actualPages}
                  className="page-link page-link-next"
                  style={{
                    backgroundColor: currentPage >= actualPages ? 'var(--btn-secondary-bg)' : 'var(--card-bg)',
                    borderColor: 'var(--border-primary)',
                    color: currentPage >= actualPages ? 'var(--text-tertiary)' : 'var(--btn-primary-bg)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <span className="d-none d-sm-inline">Next</span>
                  <i className="bi bi-chevron-right ms-1"></i>
                </button>
              </li>
            </ul>
          </nav>
          
          {config.pagination.showSizeSelector && (
            <div className="table-pagination-size">
              <select
                value={config.pagination.limit}
                onChange={(e) => config.onPageSizeChange?.(Number(e.target.value))}
                className="form-select form-select-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)',
                  paddingRight: '2rem',
                  backgroundPosition: 'right 0.5rem center'
                }}
              >
                {config.pagination.sizeSelectorOptions?.map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      
      {/* Mobile Responsive Styles */}
      <style jsx>{`
        .table-pagination-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .table-pagination-info {
          flex: 0 1 auto;
          min-width: 150px;
          font-size: 0.875rem;
        }

        .table-pagination-nav {
          flex: 1 1 auto;
          display: flex;
          justify-content: center;
        }

        .table-pagination-size {
          flex: 0 0 auto;
          min-width: 150px;
        }

        .table-pagination-size .form-select {
          width: auto;
          min-width: 150px;
        }

        @media (max-width: 768px) {
          .table-pagination-wrapper {
            flex-direction: column;
            gap: 0.75rem;
            align-items: stretch;
          }

          .table-pagination-info {
            text-align: center;
            order: 1;
            font-size: 0.8rem;
          }

          .table-pagination-nav {
            order: 2;
            justify-content: center;
          }

          .table-pagination-nav .pagination {
            gap: 0.25rem;
            flex-wrap: wrap;
            justify-content: center;
          }

          .table-pagination-nav .page-item {
            margin: 0.125rem;
          }

          .table-pagination-nav .page-link {
            padding: 0.375rem 0.5rem;
            font-size: 0.875rem;
            min-width: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .table-pagination-nav .page-link-prev,
          .table-pagination-nav .page-link-next {
            padding: 0.375rem 0.75rem;
          }

          .table-pagination-size {
            order: 3;
            width: 100%;
          }

          .table-pagination-size .form-select {
            width: 100%;
          }
        }

        @media (max-width: 576px) {
          .table-pagination-info {
            font-size: 0.75rem;
          }

          .table-pagination-nav .page-link {
            padding: 0.3rem 0.4rem;
            font-size: 0.8rem;
            min-width: 32px;
          }

          .table-pagination-nav .page-link-prev,
          .table-pagination-nav .page-link-next {
            padding: 0.3rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}