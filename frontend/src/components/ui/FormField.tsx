import { cloneElement, useId, type ReactElement } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label + control + error message, wired together for screen readers. */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {(error || hint) && (
        <p id={messageId} className={error ? 'field__error' : 'field__hint'}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
