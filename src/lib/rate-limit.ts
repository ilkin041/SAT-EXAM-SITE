interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const globalRateLimit = globalThis as typeof globalThis & {
  __satRateLimitBuckets?: Map<string, RateLimitBucket>;
};
const buckets = (globalRateLimit.__satRateLimitBuckets ??= new Map());

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Lightweight per-instance fixed-window limiter suitable for the current scale. */
export function checkRateLimit(
  request: Request,
  scope: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${getRequestIp(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    pruneExpiredBuckets(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 1_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
