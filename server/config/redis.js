const redis = require('redis');

let redisClient = null;
let redisAvailable = false;

const getRedisClient = async () => {
  if (redisClient && redisClient.isOpen) return redisClient;
  if (redisClient && !redisAvailable) return null;

  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = redis.createClient({ url });
    redisClient.on('error', () => {});
    await redisClient.connect();
    redisAvailable = true;
    console.log('Redis Connected');
    return redisClient;
  } catch (err) {
    console.warn('Redis not available, caching disabled:', err.message);
    redisAvailable = false;
    redisClient = null;
    return null;
  }
};

const cacheRankings = async (jobId, rankings, ttlSeconds = 600) => {
  try {
    const client = await getRedisClient();
    if (!client) return;
    const key = `job:${jobId}:rankings`;
    await client.setEx(key, ttlSeconds, JSON.stringify(rankings));
  } catch (err) {
    // Silently fail - caching is optional
  }
};

const getCachedRankings = async (jobId) => {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const key = `job:${jobId}:rankings`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};

const invalidateJobCache = async (jobId) => {
  try {
    const client = await getRedisClient();
    if (!client) return;
    const key = `job:${jobId}:rankings`;
    await client.del(key);
  } catch (err) {
    // Silently fail
  }
};

module.exports = {
  getRedisClient,
  cacheRankings,
  getCachedRankings,
  invalidateJobCache,
};
