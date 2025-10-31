import { ReactNode } from 'react';

// Modal configuration types
export interface ModalConfig {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  scrollable?: boolean;
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  fade?: boolean;
}

export interface ModalProps extends ModalConfig {
  show: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  closeButton?: boolean;
  onBackdropClick?: () => void;
}

export const defaultModalConfig: ModalConfig = {
  size: 'md',
  centered: false,
  scrollable: false,
  backdrop: true,
  keyboard: true,
  fade: true,
};

export const modalSizeClasses = {
  sm: 'modal-sm',
  md: '',
  lg: 'modal-lg',
  xl: 'modal-xl',
};