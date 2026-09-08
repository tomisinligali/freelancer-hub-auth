import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = "", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="fh-input-group">
        {label ? (
          <label htmlFor={inputId} className="fh-input-label">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={`fh-input ${error ? "fh-input--error" : ""} ${className}`}
          {...props}
        />
        {error ? (
          <span className="fh-input-error-text" role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span className="fh-input-helper-text">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
