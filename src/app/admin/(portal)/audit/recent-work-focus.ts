"use client";

// Shared post-navigation focus for Recent work. Pagination, search, and
// Filters wait for the live summary; Clear targets the search field. The
// Poll covers the App Router render gap after client navigation.

const MAX_ATTEMPTS = 20;
const RETRY_MS = 50;

export function focusWhenPresent(id: string, attempt = 0): void {
  const node = document.getElementById(id);
  if (node !== null) {
    node.focus();
    return;
  }
  if (attempt < MAX_ATTEMPTS) {
    window.setTimeout(() => {
      focusWhenPresent(id, attempt + 1);
    }, RETRY_MS);
  }
}

export function focusAfterNavigate(id: string): void {
  window.setTimeout(() => {
    focusWhenPresent(id, 0);
  }, 0);
}

export function isUnmodifiedPrimaryClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
