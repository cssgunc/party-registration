import type { Page } from "@playwright/test";

/**
 * Registers lazy, cached test steps for a `describe` scope.
 *
 * Steps mutate the shared `ctx` object and return the keys they populated
 * (use `as const` on the array). The return value is re-read from `ctx` on
 * every call — even cached ones — so mutable fields stay current across steps.
 * Dependencies are expressed by calling other step functions inside the body.
 */
export class Steps<TCtx extends Record<string, unknown>> {
  private readonly ran = new Set<symbol>();

  constructor(private readonly ctx: TCtx) {}

  step<const K extends keyof TCtx>(
    fn: (page: Page) => Promise<readonly K[]>
  ): (page: Page) => Promise<{ [P in K]: NonNullable<TCtx[P]> }> {
    const sym = Symbol();
    let keys: readonly K[] = [];
    return async (page) => {
      if (!this.ran.has(sym)) {
        keys = await fn(page);
        this.ran.add(sym);
      }
      return Object.fromEntries(keys.map((k) => [k, this.ctx[k]])) as {
        [P in K]: NonNullable<TCtx[P]>;
      };
    };
  }
}
