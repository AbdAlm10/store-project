/**
 * Resolve with `fallback` when `work` does not settle in time.
 * The original promise is left running; callers must not depend on it
 * after the timeout.
 */
export function withTimeout<T>(
  work: PromiseLike<T>,
  timeoutMs: number,
  fallback: T,
  label?: string,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      if (label) {
        console.error(`${label} timed out after ${timeoutMs}ms`);
      }
      finish(fallback);
    }, Math.max(0, timeoutMs));
    Promise.resolve(work).then(
      (value) => finish(value),
      () => finish(fallback),
    );
  });
}
