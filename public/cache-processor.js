// Cache Processor Worker
let cache = new Map();
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

// Worker ready message
self.postMessage({
  type: 'WORKER_READY',
  data: { timestamp: Date.now() }
});

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'CACHE_SET':
      cacheSet(data.key, data.value, data.ttl);
      break;
      
    case 'CACHE_GET':
      cacheGet(data.key);
      break;
      
    case 'CACHE_DELETE':
      cacheDelete(data.key);
      break;
      
    case 'CACHE_CLEAR':
      cacheClear();
      break;
      
    case 'CACHE_STATS':
      getCacheStats();
      break;
      
    case 'CACHE_POOLS':
      cachePools(data.pools);
      break;
      
    case 'GET_CACHED_POOLS':
      getCachedPools();
      break;
      
    case 'CACHE_POSITIONS':
      cachePositions(data.positions);
      break;
      
    case 'GET_CACHED_POSITIONS':
      getCachedPositions();
      break;
      
    case 'CACHE_API_RESPONSE':
      cacheApiResponse(data.key, data.response, data.ttl);
      break;
      
    case 'GET_CACHED_API_RESPONSE':
      getCachedApiResponse(data.key);
      break;
  }
};

function cacheSet(key, value, ttl = 300000) { // Default 5 minutes TTL
  const item = {
    value: value,
    timestamp: Date.now(),
    ttl: ttl
  };
  
  cache.set(key, item);
  cacheStats.sets++;
  
  self.postMessage({
    type: 'CACHE_SET',
    data: { key, success: true, timestamp: Date.now() }
  });
}

function cacheGet(key) {
  const item = cache.get(key);
  
  if (!item) {
    cacheStats.misses++;
    self.postMessage({
      type: 'CACHE_GET',
      data: { key, value: null, hit: false }
    });
    return;
  }
  
  // Check if expired
  if (Date.now() - item.timestamp > item.ttl) {
    cache.delete(key);
    cacheStats.misses++;
    self.postMessage({
      type: 'CACHE_GET',
      data: { key, value: null, hit: false, expired: true }
    });
    return;
  }
  
  cacheStats.hits++;
  self.postMessage({
    type: 'CACHE_GET',
    data: { key, value: item.value, hit: true, timestamp: item.timestamp }
  });
}

function cacheDelete(key) {
  const deleted = cache.delete(key);
  if (deleted) cacheStats.deletes++;
  
  self.postMessage({
    type: 'CACHE_DELETED',
    data: { key, deleted }
  });
}

function cacheClear() {
  cache.clear();
  cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  
  self.postMessage({
    type: 'CACHE_CLEARED',
    data: { timestamp: Date.now() }
  });
}

function getCacheStats() {
  self.postMessage({
    type: 'CACHE_STATS',
    data: {
      stats: cacheStats,
      size: cache.size,
      timestamp: Date.now()
    }
  });
}

function cachePools(pools) {
  cacheSet('pools_data', pools, 5 * 60 * 1000); // 5 minutes TTL
  
  self.postMessage({
    type: 'POOLS_CACHED',
    data: { count: pools.length, timestamp: Date.now() }
  });
}

function getCachedPools() {
  cacheGet('pools_data');
  
  const item = cache.get('pools_data');
  if (item && Date.now() - item.timestamp <= item.ttl) {
    self.postMessage({
      type: 'CACHED_POOLS_RETRIEVED',
      data: { pools: item.value, timestamp: item.timestamp }
    });
  } else {
    self.postMessage({
      type: 'CACHED_POOLS_RETRIEVED',
      data: { pools: null }
    });
  }
}

function cachePositions(positions) {
  cacheSet('positions_data', positions, 2 * 60 * 1000); // 2 minutes TTL
  
  self.postMessage({
    type: 'POSITIONS_CACHED',
    data: { count: positions.length, timestamp: Date.now() }
  });
}

function getCachedPositions() {
  const item = cache.get('positions_data');
  if (item && Date.now() - item.timestamp <= item.ttl) {
    self.postMessage({
      type: 'CACHED_POSITIONS_RETRIEVED',
      data: { positions: item.value, timestamp: item.timestamp }
    });
  } else {
    self.postMessage({
      type: 'CACHED_POSITIONS_RETRIEVED',
      data: { positions: null }
    });
  }
}

function cacheApiResponse(key, response, ttl) {
  cacheSet(`api_${key}`, response, ttl);
  
  self.postMessage({
    type: 'API_RESPONSE_CACHED',
    data: { key, timestamp: Date.now() }
  });
}

function getCachedApiResponse(key) {
  const item = cache.get(`api_${key}`);
  if (item && Date.now() - item.timestamp <= item.ttl) {
    self.postMessage({
      type: 'CACHED_API_RESPONSE_RETRIEVED',
      data: { key, response: item.value, timestamp: item.timestamp }
    });
  } else {
    self.postMessage({
      type: 'CACHED_API_RESPONSE_RETRIEVED',
      data: { key, response: null }
    });
  }
}

// Cleanup expired items every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > item.ttl) {
      cache.delete(key);
    }
  }
}, 60000);