import {
  socketConnectionsActive,
  socketConnectionsTotal,
  socketDisconnectionsTotal,
  socketEventsTotal,
  socketEventDuration,
  messagesTotal,
  messageDeliveryTime,
  messagesDeliveredTotal,
  messagesSeenTotal,
  usersOnline,
  errorsTotal,
} from '../metrics/prometheus.js';

/**
 * Track socket connection
 */
export const trackSocketConnection = () => {
  socketConnectionsActive.inc();
  socketConnectionsTotal.inc();
};

/**
 * Track socket disconnection
 */
export const trackSocketDisconnection = () => {
  socketConnectionsActive.dec();
  socketDisconnectionsTotal.inc();
};

/**
 * Track socket event
 * @param {string} eventType - Type of event (e.g., 'sendMessage', 'startTyping')
 * @param {Function} handler - The event handler function
 * @returns {Function} Wrapped handler with metrics
 */
export const trackSocketEvent = (eventType, handler) => {
  return async (...args) => {
    const startTime = Date.now();
    socketEventsTotal.labels(eventType).inc();
    
    try {
      const result = await handler(...args);
      const duration = (Date.now() - startTime) / 1000;
      socketEventDuration.labels(eventType).observe(duration);
      return result;
    } catch (error) {
      errorsTotal.labels('socket_event', eventType).inc();
      throw error;
    }
  };
};

/**
 * Track message send
 * @param {string} messageType - Type of message (e.g., 'text', 'image')
 */
export const trackMessageSent = (messageType = 'text') => {
  messagesTotal.labels(messageType).inc();
};

/**
 * Track message delivery
 * @param {string} messageType - Type of message
 * @param {number} duration - Delivery duration in seconds
 */
export const trackMessageDelivery = (messageType = 'text', duration = 0) => {
  messagesDeliveredTotal.inc();
  messageDeliveryTime.labels(messageType).observe(duration);
};

/**
 * Track message seen
 */
export const trackMessageSeen = () => {
  messagesSeenTotal.inc();
};

/**
 * Update online users count
 * @param {number} count - Current online users count
 */
export const updateOnlineUsers = (count) => {
  usersOnline.set(count);
};
