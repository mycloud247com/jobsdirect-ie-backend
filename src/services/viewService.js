import { getRedis, isRedisAvailable } from "./redisClient.js";

class ViewService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Track a unique job view. Uses Redis for deduplication when available,
   * falls back to direct DB increment otherwise.
   */
  async trackView(jobId, ip) {
    if (isRedisAvailable()) {
      const redis = getRedis();
      const date = new Date().toISOString().split("T")[0];
      const uniqueKey = `job_views:${jobId}:${date}`;
      const totalKey = `job_views_total:${jobId}`;

      try {
        const isNew = await redis.sadd(uniqueKey, ip);
        if (isNew) {
          await redis.incr(totalKey);
        }
        await redis.expire(uniqueKey, 86400 * 2);
        return;
      } catch {
        // Redis failed mid-operation — fall through to DB
      }
    }

    // Fallback: increment directly in DB (no IP deduplication)
    try {
      await this.db.Job.increment("viewsCount", {
        by: 1,
        where: { id: jobId },
      });
    } catch {
      // Silently skip if DB update fails
    }
  }

  /**
   * Flush accumulated view counts from Redis to PostgreSQL.
   * Called periodically (every 5 minutes).
   */
  async flushViewsToDB() {
    if (!isRedisAvailable()) return;
    const redis = getRedis();

    try {
      const keys = await redis.keys("job_views_total:*");
      if (!keys.length) return;

      for (const key of keys) {
        const jobId = key.replace("job_views_total:", "");
        const count = await redis.getdel(key);
        if (count && Number(count) > 0) {
          await this.db.Job.increment("viewsCount", {
            by: Number(count),
            where: { id: jobId },
          });
        }
      }
    } catch {
      // Redis or DB failure — will retry next flush
    }
  }
}

export default ViewService;
