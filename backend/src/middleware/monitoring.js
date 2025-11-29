const promClient = require('prom-client');

// Create metrics registry
const register = new promClient.Registry();

// System metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'sysme_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'sysme_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeUsers = new promClient.Gauge({
  name: 'sysme_active_users',
  help: 'Number of currently active users'
});

// Business metrics
const salesTotal = new promClient.Counter({
  name: 'sysme_sales_total',
  help: 'Total sales amount',
  labelNames: ['payment_method', 'user_id']
});

const salesCount = new promClient.Counter({
  name: 'sysme_sales_count',
  help: 'Total number of sales',
  labelNames: ['payment_method', 'user_id']
});

const productsSold = new promClient.Counter({
  name: 'sysme_products_sold_total',
  help: 'Total number of products sold',
  labelNames: ['product_id', 'category_id']
});

const lowStockProducts = new promClient.Gauge({
  name: 'sysme_low_stock_products',
  help: 'Number of products with low stock'
});

// Database metrics
const dbConnectionsActive = new promClient.Gauge({
  name: 'sysme_db_connections_active',
  help: 'Number of active database connections'
});

const dbQueryDuration = new promClient.Histogram({
  name: 'sysme_db_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['query_type'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
});

// Security metrics
const failedLogins = new promClient.Counter({
  name: 'sysme_failed_logins_total',
  help: 'Total number of failed login attempts',
  labelNames: ['ip', 'username']
});

const rateLimitHits = new promClient.Counter({
  name: 'sysme_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['ip', 'endpoint']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeUsers);
register.registerMetric(salesTotal);
register.registerMetric(salesCount);
register.registerMetric(productsSold);
register.registerMetric(lowStockProducts);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbQueryDuration);
register.registerMetric(failedLogins);
register.registerMetric(rateLimitHits);

// Collect default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// HTTP monitoring middleware
function monitoringMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
}

// Business metrics tracking functions
function trackSale(amount, paymentMethod, userId) {
  salesTotal.labels(paymentMethod, userId).inc(amount);
  salesCount.labels(paymentMethod, userId).inc();
}

function trackProductSold(productId, categoryId, quantity = 1) {
  productsSold.labels(productId.toString(), categoryId.toString()).inc(quantity);
}

function updateLowStockCount(count) {
  lowStockProducts.set(count);
}

function updateActiveUsers(count) {
  activeUsers.set(count);
}

function trackFailedLogin(ip, username) {
  failedLogins.labels(ip, username).inc();
}

function trackRateLimitHit(ip, endpoint) {
  rateLimitHits.labels(ip, endpoint).inc();
}

function trackDbQuery(queryType, duration) {
  dbQueryDuration.labels(queryType).observe(duration);
}

function updateDbConnections(count) {
  dbConnectionsActive.set(count);
}

module.exports = {
  register,
  monitoringMiddleware,
  trackSale,
  trackProductSold,
  updateLowStockCount,
  updateActiveUsers,
  trackFailedLogin,
  trackRateLimitHit,
  trackDbQuery,
  updateDbConnections
};