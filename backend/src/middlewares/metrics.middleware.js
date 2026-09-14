import { httpRequestDuration, httpRequestsTotal } from '../metrics/prometheus.js';

/**
 * Express middleware for collecting HTTP metrics
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Get route path (without specific IDs to avoid high cardinality)
  const route = req.route ? req.route.path : req.path;
  const method = req.method;
  
  // Intercept the original send method
  const originalSend = res.send;
  res.send = function(data) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const statusCode = res.statusCode;
    
    // Record metrics
    httpRequestDuration.labels(method, route, statusCode).observe(duration);
    httpRequestsTotal.labels(method, route, statusCode).inc();
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

export default metricsMiddleware;
