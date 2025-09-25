import { useState, useCallback, useRef } from 'react';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const useConfirmation = () => {
  const [config, setConfig] = useState<ConfirmationOptions | null>(null);
  const [show, setShow] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    setConfig(options);
    setShow(true);
    
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setShow(false);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShow(false);
    resolveRef.current?.(false);
  }, []);

  return {
    show,
    config,
    confirm,
    handleConfirm,
    handleCancel
  };
};