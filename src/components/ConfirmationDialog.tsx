"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/styles/colors";

interface ConfirmationDialogProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  show,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  if (!show) return null;

  const getTypeConfig = () => {
    switch (type) {
      case "danger":
        return {
          headerBg: colors.notification.error.background,
          headerText: colors.notification.error.text,
          headerBorder: colors.notification.error.border,
          icon: "bi-exclamation-triangle-fill",
          confirmBg: colors.status.error,
          confirmText: colors.text.inverse,
        };
      case "warning":
        return {
          headerBg: colors.notification.warning.background,
          headerText: colors.notification.warning.text,
          headerBorder: colors.notification.warning.border,
          icon: "bi-exclamation-triangle-fill",
          confirmBg: colors.status.warning,
          confirmText: colors.text.inverse,
        };
      case "info":
        return {
          headerBg: colors.notification.info.background,
          headerText: colors.notification.info.text,
          headerBorder: colors.notification.info.border,
          icon: "bi-info-circle-fill",
          confirmBg: colors.button.primary.background,
          confirmText: colors.button.primary.text,
        };
      default:
        return {
          headerBg: colors.card.background,
          headerText: colors.text.primary,
          headerBorder: colors.border.primary,
          icon: "bi-question-circle-fill",
          confirmBg: colors.button.secondary.background,
          confirmText: colors.button.secondary.text,
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      className="modal show"
      style={{
        display: "block",
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(3px)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1055,
        overflowX: "hidden",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content"
          style={{
            backgroundColor: colors.card.background,
            borderColor: colors.card.border,
          }}
        >
          <div
            className="modal-header"
            style={{
              backgroundColor: config.headerBg,
              borderColor: config.headerBorder,
              borderBottomWidth: "1px",
              borderBottomStyle: "solid",
            }}
          >
            <h5
              className="modal-title d-flex align-items-center"
              style={{ color: config.headerText }}
            >
              <i
                className={`bi ${config.icon} me-2`}
                style={{ color: config.headerText }}
              ></i>
              {title}
            </h5>
          </div>
          <div
            className="modal-body"
            style={{
              backgroundColor: colors.card.background,
              color: colors.text.primary,
            }}
          >
            <p className="mb-0" style={{ color: colors.text.primary }}>
              {message}
            </p>
          </div>
          <div
            className="modal-footer"
            style={{
              backgroundColor: colors.card.background,
              borderTopColor: colors.border.primary,
            }}
          >
            <button
              type="button"
              className="btn"
              style={{
                backgroundColor: colors.button.secondary.background,
                color: colors.button.secondary.text,
                borderColor: colors.button.secondary.border,
                border: "1px solid",
              }}
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="btn"
              style={{
                backgroundColor: config.confirmBg,
                color: config.confirmText,
                borderColor: config.confirmBg,
                border: "1px solid",
              }}
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
