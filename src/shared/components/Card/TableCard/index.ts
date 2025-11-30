/**
 * TableCard Component
 * Export all TableCard related components and utilities
 */

export { TableCard } from './TableCard';
export type { 
  TableCardProps,
  Column,
  Action,
  MobileCardData,
} from './TableCard';

export {
  createTableCardColumn,
  createTableCardConfig,
  defaultTableCardConfig,
} from './config';

export type {
  TableCardConfig,
  TableCardColumnConfig,
} from './config';

// Re-export for convenience
export { default } from './TableCard';
