"use client";

/**
 * Minimal localStorage persistence for the witness/people_present field.
 * Keyed by eventId so multiple events don't clash.
 * Write on submit, read on form open — no cleanup needed.
 */
export function usePeopleReuse(eventId: string) {
  const key = `liquifi:pp:${eventId}`;

  const read = (): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const write = (names: string) => {
    try {
      localStorage.setItem(key, names);
    } catch {
      // quota exceeded — silently skip, feature is best-effort
    }
  };

  return { read, write };
}
