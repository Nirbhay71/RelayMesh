import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// ═════════════════════════════════════════════════════════════
// CUSTOM METRICS FOR RELAYMESH
// ═════════════════════════════════════════════════════════════

// HTTP Metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Socket.io Metrics
export const socketConnectionsActive = new promClient.Gauge({
  name: 'socket_connections_active',
  help: 'Number of active socket connections',
  registers: [register],
});

export const socketConnectionsTotal = new promClient.Counter({
  name: 'socket_connections_total',
  help: 'Total number of socket connections',
  registers: [register],
});

export const socketDisconnectionsTotal = new promClient.Counter({
  name: 'socket_disconnections_total',
  help: 'Total number of socket disconnections',
  registers: [register],
});

export const socketEventsTotal = new promClient.Counter({
  name: 'socket_events_total',
  help: 'Total number of socket events by event type',
  labelNames: ['event_type'],
  registers: [register],
});

export const socketEventDuration = new promClient.Histogram({
  name: 'socket_event_duration_seconds',
  help: 'Duration of socket event handlers in seconds',
  labelNames: ['event_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Message Metrics
export const messagesTotal = new promClient.Counter({
  name: 'messages_total',
  help: 'Total number of messages sent',
  labelNames: ['message_type'],
  registers: [register],
});

export const messageDeliveryTime = new promClient.Histogram({
  name: 'message_delivery_time_seconds',
  help: 'Time taken to deliver messages in seconds',
  labelNames: ['message_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const messagesDeliveredTotal = new promClient.Counter({
  name: 'messages_delivered_total',
  help: 'Total number of messages delivered',
  registers: [register],
});

export const messagesSeenTotal = new promClient.Counter({
  name: 'messages_seen_total',
  help: 'Total number of messages marked as seen',
  registers: [register],
});

// User Metrics
export const usersOnline = new promClient.Gauge({
  name: 'users_online',
  help: 'Number of users currently online',
  registers: [register],
});

export const usersTotal = new promClient.Counter({
  name: 'users_total',
  help: 'Total number of users registered',
  registers: [register],
});

// Database Metrics
export const databaseOperationDuration = new promClient.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const databaseErrorsTotal = new promClient.Counter({
  name: 'database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'collection'],
  registers: [register],
});

// Redis Metrics
export const redisOperationDuration = new promClient.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register],
});

export const redisErrorsTotal = new promClient.Counter({
  name: 'redis_errors_total',
  help: 'Total number of Redis errors',
  labelNames: ['operation'],
  registers: [register],
});

// Conversation Metrics
export const conversationsTotal = new promClient.Counter({
  name: 'conversations_total',
  help: 'Total number of conversations created',
  registers: [register],
});

export const conversationsActive = new promClient.Gauge({
  name: 'conversations_active',
  help: 'Number of active conversations',
  registers: [register],
});

// Authentication Metrics
export const authAttemptsTotal = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status'],
  registers: [register],
});

export const authDuration = new promClient.Histogram({
  name: 'auth_duration_seconds',
  help: 'Duration of authentication operations in seconds',
  labelNames: ['auth_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Errors
export const errorsTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'location'],
  registers: [register],
});

export const register_export = register;

export default register;
