<!-- EXAMPLE: Fictitious log to demonstrate openclew doc format. Not real. -->
<!-- L1_START -->
# L1 - Metadata
date: 2026-02-15
type: Feature
subject: Redis cache layer for API responses
short_story: "[EXAMPLE] Added Redis cache for expensive queries (user profiles, product listings). Cache-aside pattern with 5min TTL. Falls back to in-memory Map in dev when Redis is unavailable."
status: Done
category: Performance
keywords: [redis, cache, performance, ttl]
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Problem

Product listing endpoint was taking 800ms due to complex joins. User profile endpoint was hitting DB on every request despite data changing rarely.

## Solution

- Cache-aside pattern: check cache → if miss, query DB → store in cache
- TTL: 5 minutes for listings, 10 minutes for profiles
- Cache invalidation on write (update/delete clears the relevant key)
- Fallback: `MemoryCache` class with same interface when `REDIS_URL` is not set

## Watch out

- Cache keys follow pattern `{entity}:{id}` (e.g. `product:123`, `user:456`)
- Invalidation is per-key, not per-prefix — bulk updates need manual flush
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Files changed

- `src/utils/cache.js` — CacheManager with Redis/Memory backends
- `src/services/productService.js` — cached `getProducts()`, `getProduct(id)`
- `src/services/userService.js` — cached `getProfile(id)`
- `docker-compose.yml` — added Redis service
<!-- L3_END -->
