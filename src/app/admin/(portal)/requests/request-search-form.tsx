"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RequestStatus } from "@/lib/portal/contracts";
import {
  REQUEST_SEARCH_INPUT_ID,
  REQUEST_SEARCH_MAX_LENGTH,
  REQUEST_SEARCH_STATUS_ID,
  REQUEST_SEARCH_SUBMIT_ID,
  parseRequestSearch,
  requestSearchStatus,
  requestsHref,
} from "@/lib/portal/request-query";

const MAX_FOCUS_ATTEMPTS = 20;
const FOCUS_RETRY_MS = 50;

function focusWhenPresent(id: string, attempt = 0): void {
  const node = document.getElementById(id);
  if (node !== null) {
    node.focus();
    return;
  }
  if (attempt < MAX_FOCUS_ATTEMPTS) {
    window.setTimeout(() => {
      focusWhenPresent(id, attempt + 1);
    }, FOCUS_RETRY_MS);
  }
}

function focusAfterNavigate(id: string): void {
  window.setTimeout(() => {
    focusWhenPresent(id, 0);
  }, 0);
}

function isUnmodifiedPrimaryClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function RequestSearchForm({
  filter,
  filteredTotal,
  search,
}: Readonly<{
  filter: RequestStatus | "all";
  filteredTotal: number;
  search: string;
}>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const announcement = requestSearchStatus({ filteredTotal, search });

  return (
    <form
      action="/admin/requests"
      method="get"
      role="search"
      className="flex flex-wrap items-end gap-2.5 px-4 pt-3.5 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(
          requestsHref({
            search: parseRequestSearch(inputRef.current?.value ?? ""),
            status: filter,
          }),
        );
        focusAfterNavigate(REQUEST_SEARCH_SUBMIT_ID);
      }}
    >
      {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
      <Field className="min-w-0 flex-[1_1_13rem] gap-1.5 md:min-w-60 md:flex-[1_1_22rem]">
        <FieldLabel htmlFor={REQUEST_SEARCH_INPUT_ID} className="text-[0.8125rem]">
          Search requests
        </FieldLabel>
        <Input
          ref={inputRef}
          id={REQUEST_SEARCH_INPUT_ID}
          name="q"
          type="search"
          defaultValue={search}
          maxLength={REQUEST_SEARCH_MAX_LENGTH}
          placeholder="Name, phone, or email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </Field>
      <Button id={REQUEST_SEARCH_SUBMIT_ID} type="submit" data-testid="request-search-submit">
        Search
      </Button>
      {search ? (
        <Button
          variant="outline"
          data-testid="request-search-clear"
          render={
            <Link
              href={requestsHref({ search: "", status: filter })}
              onClick={(event) => {
                if (!isUnmodifiedPrimaryClick(event)) return;
                event.preventDefault();
                if (inputRef.current !== null) inputRef.current.value = "";
                router.push(requestsHref({ search: "", status: filter }));
                focusAfterNavigate(REQUEST_SEARCH_INPUT_ID);
              }}
            />
          }
        >
          Clear
        </Button>
      ) : null}
      <p
        id={REQUEST_SEARCH_STATUS_ID}
        data-testid="request-search-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>
    </form>
  );
}
