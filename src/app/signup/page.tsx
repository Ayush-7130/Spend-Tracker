"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import ThemeToggle from "@/components/ThemeToggle";
import { LoadingSpinner, InputField } from "@/shared/components";

export default function SignupPage() {
  const { signup, isAuthenticated, loading } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      window.location.href = "/";
    }
  }, [isAuthenticated, loading]);

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { strength: "none", color: "secondary", label: "" };

    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      lengthStrong: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };

    if (checks.length) score++;
    if (checks.lengthStrong) score++;
    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    if (score <= 2) {
      return { strength: "weak", color: "danger", label: "Weak" };
    } else if (score <= 4) {
      return { strength: "medium", color: "warning", label: "Medium" };
    } else {
      return { strength: "strong", color: "success", label: "Strong" };
    }
  }, [formData.password]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Name must not exceed 50 characters";
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Validate terms acceptance
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signup(
        formData.name,
        formData.email,
        formData.password,
        formData.confirmPassword
      );

      if (result.success) {
        showSuccess("Account created successfully! Welcome to Spend Tracker.");
        // Redirect will happen via useEffect when isAuthenticated becomes true
      } else {
        showError(result.error || "Signup failed. Please try again.");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      showError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <LoadingSpinner
          config={{
            size: "medium",
            variant: "primary",
            showText: true,
            text: "Checking authentication...",
          }}
        />
      </div>
    );
  }

  // Check if signup is disabled
  const signupEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true";

  if (!signupEnabled) {
    return (
      <div className="auth-page-bg">
        <div
          className="position-fixed top-0 end-0 p-3"
          style={{ zIndex: 1050 }}
        >
          <ThemeToggle />
        </div>
        <div className="min-vh-100 d-flex align-items-center">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-6 col-lg-4">
                <div className="auth-card">
                  <div
                    className="card-header text-white text-center"
                    style={{
                      background: "var(--btn-primary-bg-gradient)",
                      borderColor: "var(--border-primary)",
                    }}
                  >
                    <h4 className="mb-0">
                      <i className="bi bi-wallet2 me-2"></i>
                      Spend Tracker
                    </h4>
                  </div>
                  <div className="card-body p-4 text-center">
                    <i
                      className="bi bi-exclamation-triangle"
                      style={{
                        fontSize: "3rem",
                        color: "var(--status-warning)",
                      }}
                    ></i>
                    <h5 className="mt-3">Sign Up Disabled</h5>
                    <p
                      className="mb-4"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      New account registration is currently disabled.
                    </p>
                    <Link href="/login" className="btn btn-primary">
                      <i className="bi bi-box-arrow-in-right me-1"></i>
                      Go to Login
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-bg">
      {/* Theme Toggle */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
        <ThemeToggle />
      </div>

      <div className="min-vh-100 d-flex align-items-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
              <div className="auth-card">
                <div
                  className="card-header text-white text-center"
                  style={{
                    background: "var(--btn-primary-bg-gradient)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <h4 className="mb-0">
                    <i className="bi bi-wallet2 me-2"></i>
                    Spend Tracker
                  </h4>
                  <p className="mb-0 small opacity-75">Create your account</p>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={handleSubmit}>
                    <InputField
                      label="Full Name"
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(value) =>
                        setFormData({ ...formData, name: value as string })
                      }
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                      error={errors.name}
                      required
                      autoComplete="name"
                    />

                    <InputField
                      label="Email Address"
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(value) =>
                        setFormData({ ...formData, email: value as string })
                      }
                      placeholder="Enter your email"
                      disabled={isSubmitting}
                      error={errors.email}
                      required
                      autoComplete="email"
                    />

                    <div className="mb-3">
                      <InputField
                        label="Password"
                        type="password"
                        id="password"
                        value={formData.password}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            password: value as string,
                          })
                        }
                        placeholder="Create a strong password"
                        disabled={isSubmitting}
                        error={errors.password}
                        required
                        autoComplete="new-password"
                      />

                      {/* Password strength indicator */}
                      {formData.password && (
                        <div className="mt-2">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small style={{ color: "var(--text-secondary)" }}>
                              Password strength:
                            </small>
                            <small
                              className="fw-bold"
                              style={{
                                color:
                                  passwordStrength.color === "danger"
                                    ? "var(--status-error)"
                                    : passwordStrength.color === "warning"
                                      ? "var(--status-warning)"
                                      : passwordStrength.color === "success"
                                        ? "var(--status-success)"
                                        : "var(--text-secondary)",
                              }}
                            >
                              {passwordStrength.label}
                            </small>
                          </div>
                          <div className="progress" style={{ height: "4px" }}>
                            <div
                              className={`progress-bar bg-${passwordStrength.color}`}
                              role="progressbar"
                              style={{
                                width:
                                  passwordStrength.strength === "weak"
                                    ? "33%"
                                    : passwordStrength.strength === "medium"
                                      ? "66%"
                                      : "100%",
                              }}
                              aria-valuenow={
                                passwordStrength.strength === "weak"
                                  ? 33
                                  : passwordStrength.strength === "medium"
                                    ? 66
                                    : 100
                              }
                              aria-valuemin={0}
                              aria-valuemax={100}
                            ></div>
                          </div>
                        </div>
                      )}

                      <small
                        className="form-text d-block mt-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Must be 8+ characters with uppercase, lowercase, and
                        number
                      </small>
                    </div>

                    <InputField
                      label="Confirm Password"
                      type="password"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          confirmPassword: value as string,
                        })
                      }
                      placeholder="Confirm your password"
                      disabled={isSubmitting}
                      error={errors.confirmPassword}
                      required
                      autoComplete="new-password"
                    />

                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="acceptTerms"
                          checked={formData.acceptTerms}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              acceptTerms: e.target.checked,
                            })
                          }
                          disabled={isSubmitting}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="acceptTerms"
                        >
                          I accept the{" "}
                          <a
                            href="/terms"
                            target="_blank"
                            className="text-decoration-none"
                            rel="noopener noreferrer"
                          >
                            Terms & Conditions
                          </a>
                        </label>
                      </div>
                      {errors.acceptTerms && (
                        <small
                          className="d-block mt-1"
                          style={{ color: "var(--status-error)" }}
                        >
                          {errors.acceptTerms}
                        </small>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 mb-3"
                      disabled={isSubmitting || !formData.acceptTerms}
                    >
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner
                            config={{ size: "small", showText: false }}
                            className="me-2"
                          />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-person-plus me-1"></i>
                          Create Account
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center">
                    <p
                      className="mb-0"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Already have an account?{" "}
                      <Link href="/login" className="text-decoration-none">
                        Sign in here
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
