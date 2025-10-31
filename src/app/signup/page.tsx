"use client";

import React from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { EmptyState } from "@/shared/components";

export default function SignupPage() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg">
              <div className="card-header bg-danger text-white text-center">
                <h4 className="mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Sign Up Disabled
                </h4>
              </div>
              <div className="card-body p-4">
                <EmptyState
                  icon="🚫"
                  title="Registration Currently Unavailable"
                  description="New user registration is temporarily disabled. Please contact the administrator if you need access."
                  size="medium"
                  variant="error"
                  actions={[
                    {
                      label: "Go to Login",
                      onClick: () => (window.location.href = "/login"),
                      variant: "primary",
                      icon: "box-arrow-in-right",
                    },
                    {
                      label: "Return to Home",
                      onClick: () => (window.location.href = "/"),
                      variant: "secondary",
                      icon: "house",
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="position-absolute top-0 end-0 m-3">
        <ThemeToggle />
      </div>
    </div>
  );
}
