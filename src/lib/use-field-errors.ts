import { useCallback, useState } from 'react';

/**
 * Error messages for a form's fields. `setErrors` shows what's wrong when the
 * form is submitted; `clear` hides a field's message as soon as that field is
 * edited, so nobody stares at an error they've already fixed.
 */
export function useFieldErrors<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});
  const clear = useCallback(
    (...keys: K[]) =>
      setErrors((current) => {
        if (!keys.some((k) => current[k])) return current;
        const next = { ...current };
        for (const k of keys) delete next[k];
        return next;
      }),
    [],
  );
  return { errors, setErrors, clear };
}
