/**
 * Not Found Middleware
 * Handles 404 errors for unmatched routes
 */

import { logger } from '../config/logger.js';

export const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  
  // Log the 404 attempt
  logger.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    userId: req.user?.id || null,
    query: req.query
  });
  
  res.status(404).json({
    success: false,
    error: message,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
};

export default notFound;