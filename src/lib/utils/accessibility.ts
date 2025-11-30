/**
 * Accessibility Utilities
 * 
 * Helper functions and utilities for improving WCAG 2.1 compliance.
 */

// ===========================================================================
// ARIA HELPERS
// ===========================================================================

/**
 * Generate unique ID for ARIA relationships
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create ARIA label from text content
 */
export function createAriaLabel(text: string, context?: string): string {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  return context ? `${context}: ${cleanText}` : cleanText;
}

// ===========================================================================
// FOCUS MANAGEMENT
// ===========================================================================

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private container: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  activate() {
    // Store current focus
    this.previousFocus = document.activeElement as HTMLElement;

    // Get all focusable elements
    this.focusableElements = this.getFocusableElements();

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);

    // Restore previous focus
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  private getFocusableElements(): HTMLElement[] {
    const selector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    
    return Array.from(this.container.querySelectorAll(selector)) as HTMLElement[];
  }
}

/**
 * Set focus to element after a delay (useful for dynamic content)
 */
export function focusElement(selector: string, delay: number = 100): void {
  setTimeout(() => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  }, delay);
}

// ===========================================================================
// KEYBOARD NAVIGATION
// ===========================================================================

/**
 * Handle escape key for closing modals/dialogs
 */
export function handleEscapeKey(callback: () => void): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      callback();
    }
  };
}

/**
 * Handle enter/space keys for custom interactive elements
 */
export function handleActionKeys(callback: () => void): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

/**
 * Handle arrow keys for navigation (e.g., dropdowns, menus)
 */
export function handleArrowKeys(options: {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
}): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        options.onUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        options.onDown?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        options.onLeft?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        options.onRight?.();
        break;
    }
  };
}

// ===========================================================================
// SCREEN READER ANNOUNCEMENTS
// ===========================================================================

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'visually-hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Create skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'visually-hidden-focusable';
  skipLink.textContent = label;
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  });
  return skipLink;
}

// ===========================================================================
// COLOR CONTRAST
// ===========================================================================

/**
 * Calculate relative luminance for WCAG contrast ratio
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(contrastRatio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(contrastRatio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
}

// ===========================================================================
// TOUCH TARGET SIZE
// ===========================================================================

/**
 * Check if element meets minimum touch target size (44x44px)
 */
export function meetsTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= 44 && rect.height >= 44;
}

/**
 * Get recommended touch target size
 */
export function getRecommendedTouchTargetSize(): { width: number; height: number } {
  return { width: 44, height: 44 };
}

// ===========================================================================
// FORM ACCESSIBILITY
// ===========================================================================

/**
 * Associate label with input programmatically
 */
export function associateLabelWithInput(labelId: string, inputId: string): void {
  const label = document.getElementById(labelId);
  const input = document.getElementById(inputId);

  if (label && input) {
    label.setAttribute('for', inputId);
    if (!input.getAttribute('aria-labelledby')) {
      input.setAttribute('aria-labelledby', labelId);
    }
  }
}

/**
 * Add required field indicator
 */
export function markFieldAsRequired(inputId: string, required: boolean = true): void {
  const input = document.getElementById(inputId);
  if (input) {
    if (required) {
      input.setAttribute('required', '');
      input.setAttribute('aria-required', 'true');
    } else {
      input.removeAttribute('required');
      input.removeAttribute('aria-required');
    }
  }
}

/**
 * Add error message to form field
 */
export function addErrorToField(inputId: string, errorMessage: string): void {
  const input = document.getElementById(inputId);
  if (!input) return;

  const errorId = `${inputId}-error`;
  let errorElement = document.getElementById(errorId);

  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = 'invalid-feedback';
    errorElement.setAttribute('role', 'alert');
    input.parentElement?.appendChild(errorElement);
  }

  errorElement.textContent = errorMessage;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', errorId);
  input.classList.add('is-invalid');
}

/**
 * Clear error from form field
 */
export function clearErrorFromField(inputId: string): void {
  const input = document.getElementById(inputId);
  if (!input) return;

  const errorId = `${inputId}-error`;
  const errorElement = document.getElementById(errorId);

  if (errorElement) {
    errorElement.remove();
  }

  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
  input.classList.remove('is-invalid');
}

// ===========================================================================
// EXPORT
// ===========================================================================

export default {
  generateAriaId,
  createAriaLabel,
  FocusTrap,
  focusElement,
  handleEscapeKey,
  handleActionKeys,
  handleArrowKeys,
  announceToScreenReader,
  createSkipLink,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  meetsTouchTargetSize,
  getRecommendedTouchTargetSize,
  associateLabelWithInput,
  markFieldAsRequired,
  addErrorToField,
  clearErrorFromField,
};
