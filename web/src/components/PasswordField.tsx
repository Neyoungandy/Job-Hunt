"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
  matchWith?: string;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  hint,
  matchWith,
}: PasswordFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [visible, setVisible] = useState(false);

  const showMatch =
    matchWith !== undefined && (value.length > 0 || matchWith.length > 0);
  const matches = showMatch && value === matchWith && value.length > 0;
  const mismatches = showMatch && value.length > 0 && value !== matchWith;

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
      >
        {label}
      </label>
      <div className="password-field-wrap">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          className="input-field password-field-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={minLength}
        />
        <button
          type="button"
          className="password-field-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      {hint && !showMatch && (
        <p className="mt-1.5 text-xs text-[var(--muted)]">{hint}</p>
      )}
      {matches && (
        <p className="mt-1.5 text-xs text-[var(--success)]">
          Passwords match — you&apos;re good to go.
        </p>
      )}
      {mismatches && (
        <p className="mt-1.5 text-xs text-[var(--warning)]">
          Passwords do not match yet.
        </p>
      )}
    </div>
  );
}
