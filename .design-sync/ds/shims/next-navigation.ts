/* Browser shim for `next/navigation`.
 *
 * Header, NoticeBanner, AppointmentForm and LanguageChooser read the current
 * path to mark the active nav item and to build locale-swap targets. Outside
 * Next there is no router, so these return inert values: a stable path and a
 * no-op router. Previews render the un-navigated state, which is the state
 * worth showing on a card anyway. */

export function usePathname(): string {
  return "/";
}

export interface AppRouterInstance {
  push: (href: string) => void;
  replace: (href: string) => void;
  refresh: () => void;
  back: () => void;
  forward: () => void;
  prefetch: (href: string) => void;
}

const noopRouter: AppRouterInstance = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

export function useRouter(): AppRouterInstance {
  return noopRouter;
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams<T = Record<string, string | string[]>>(): T {
  return {} as T;
}

export function useSelectedLayoutSegment(): string | null {
  return null;
}

export function useSelectedLayoutSegments(): string[] {
  return [];
}

export function redirect(_href: string): never {
  throw new Error("[design-sync shim] redirect() is not available outside Next");
}

export function notFound(): never {
  throw new Error("[design-sync shim] notFound() is not available outside Next");
}
