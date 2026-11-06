import { input } from "./button";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, id, name, className, ...props }: FieldProps) {
  const fieldId = id ?? `field-${name}`;
  const noteId = `${fieldId}-note`;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px] font-medium">
        {label}
        {hint && <span className="text-sm font-normal text-ink-faint">{hint}</span>}
      </label>
      <input
        id={fieldId}
        name={name}
        className={input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? noteId : undefined}
        {...props}
      />
      {error && (
        <p id={noteId} className="mt-1.5 text-sm font-medium text-alarm">
          {error}
        </p>
      )}
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  children: React.ReactNode;
};

export function SelectField({ label, error, id, name, children, className, ...props }: SelectProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-[15px] font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          className={`${input} appearance-none pr-10`}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
        >
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-alarm">{error}</p>}
    </div>
  );
}

/** The message under a form: an error or a confirmation, read out by screen readers. */
export function FormMessage({ ok, message }: { ok: boolean; message: string }) {
  return (
    <p aria-live="polite" className={`min-h-5 text-sm font-medium ${ok ? "text-leaf" : "text-alarm"}`}>
      {message}
    </p>
  );
}
