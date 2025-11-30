import { ReactNode } from "react";

// User badge configuration
export interface UserBadgeProps {
  user: "saket" | "ayush";
  variant?: "default" | "small" | "avatar";
  showName?: boolean;
  className?: string;
}

// Status badge configuration
export interface StatusBadgeProps {
  status: string;
  type: "user" | "split" | "settlement" | "category" | "custom";
  variant?: "default" | "small";
  className?: string;
  color?: string;
}

// Generic badge configuration
export interface BadgeProps {
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
  outline?: boolean;
}

export const userConfig = {
  saket: {
    name: "Saket",
    color: "primary",
    avatar: "S",
  },
  ayush: {
    name: "Ayush",
    color: "success",
    avatar: "A",
  },
} as const;

export const statusTypeConfig = {
  user: {
    saket: "primary",
    ayush: "success",
  },
  split: {
    split: "warning",
    personal: "light",
  },
  settlement: {
    owes: "danger",
    settled: "success",
    pending: "warning",
    borrow: "danger",
  },
  category: {
    default: "secondary",
  },
} as const;
