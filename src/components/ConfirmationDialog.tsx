import React from 'react';

interface ConfirmationDialogProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  show,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel
}) => {
  if (!show) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          headerClass: 'bg-danger text-white',
          icon: 'bi-exclamation-triangle-fill',
          confirmClass: 'btn-danger'
        };
      case 'warning':
        return {
          headerClass: 'bg-warning text-dark',
          icon: 'bi-exclamation-triangle-fill',
          confirmClass: 'btn-warning'
        };
      case 'info':
        return {
          headerClass: 'bg-info text-white',
          icon: 'bi-info-circle-fill',
          confirmClass: 'btn-info'
        };
      default:
        return {
          headerClass: 'bg-secondary text-white',
          icon: 'bi-question-circle-fill',
          confirmClass: 'btn-secondary'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div 
      className="modal show" 
      style={{ 
        display: 'block', 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        backdropFilter: 'blur(3px)' 
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className={`modal-header ${config.headerClass}`}>
            <h5 className="modal-title d-flex align-items-center">
              <i className={`bi ${config.icon} me-2`}></i>
              {title}
            </h5>
          </div>
          <div className="modal-body">
            <p className="mb-0">{message}</p>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button 
              type="button" 
              className={`btn ${config.confirmClass}`} 
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;