# RelayMesh Monitoring Setup Guide

This guide walks you through setting up Grafana and Prometheus monitoring for RelayMesh.

## Overview

The monitoring stack consists of:
- **Prometheus**: Time-series database for metrics collection
- **Grafana**: Visualization platform with dashboards
- **prom-client**: Node.js library for collecting Prometheus metrics

## Architecture

```
┌──────────────────┐
│   RelayMesh      │
│    Backend       │
│  (Express + Socket.io)  │
│    :7100         │
└─────────┬────────┘
          │
          │ /metrics endpoint
          ↓
┌──────────────────┐
│   Prometheus     │
│    :9090         │
│ (scrapes metrics)│
└─────────┬────────┘
          │
          ↓
┌──────────────────┐
│    Grafana       │
│    :3000         │
│ (visualizes data)│
└──────────────────┘
```

## Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- Backend running on port 7100

## Installation Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install prom-client
```

### Step 2: Update backend/src/app.js

Add these imports at the top:

```javascript
import metricsMiddleware from './middlewares/metrics.middleware.js';
import { metricsRouter } from './routes/metrics.routes.js';
```

Add this after app initialization (after passport setup):

```javascript
// Metrics middleware - must be early in middleware chain
app.use(metricsMiddleware);

// Metrics endpoint
app.use('/', metricsRouter);
```

### Step 3: Update backend/src/socket.js

Add these imports:

```javascript
import {
  trackSocketConnection,
  trackSocketDisconnection,
  trackSocketEvent,
  trackMessageSent,
  trackMessageDelivery,
  trackMessageSeen,
  updateOnlineUsers
} from './utils/socket-metrics.js';
```

Update the connection handler to track metrics:

```javascript
io.on("connection", async (socket) => {
  // Track connection
  trackSocketConnection();
  
  const userId = socket.user._id.toString();
  console.log(`User connected: ${socket.user.username} (${userId})`);
  
  // ... rest of your code ...
  
  // Wrap sendMessage event handler
  socket.on("sendMessage", trackSocketEvent('sendMessage', async (data) => {
    const { recipientId, content, messageType = "text" } = data;
    
    console.log(`[2] [Server] Received sendMessage from ${socket.user.username} to ${recipientId}`);
    
    try {
      if (!recipientId || !content) return;
      
      trackMessageSent(messageType);
      
      // ... rest of your sendMessage handler code ...
      
    } catch (error) {
      console.error("Socket error (sendMessage):", error.message);
      socket.emit("error", { message: "Failed to send message" });
    }
  }));
  
  // Track disconnection
  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    trackSocketDisconnection();
    // ... rest of your disconnect handler ...
  });
});
```

### Step 4: Start Monitoring Stack

```bash
cd backend
docker-compose up -d
```

This starts:
- **Prometheus** on http://localhost:9090
- **Grafana** on http://localhost:3000

### Step 5: Start Your Backend

In a new terminal:

```bash
cd backend
npm run run
```

### Step 6: Access Grafana

1. Open http://localhost:3000
2. Login with credentials:
   - Username: `admin`
   - Password: `admin` (change this in production)
3. Go to Dashboards → RelayMesh Monitoring

## Available Dashboards

### RelayMesh Monitoring Dashboard

Included visualizations:

1. **Socket Events Rate** - Messages/sec for each socket event type
2. **Active Socket Connections** - Real-time active connections gauge
3. **Users Online** - Number of currently online users
4. **Socket Event Duration** - 95th percentile duration for socket events
5. **Messages Sent Rate** - Message throughput per message type
6. **HTTP Requests Rate** - API request rate by method and route
7. **HTTP Request Duration** - 95th percentile request latency
8. **Errors Rate** - Error rate by type and location

## Metrics Reference

### Socket.io Metrics

- `socket_connections_active` - Current active connections
- `socket_connections_total` - Total connections over time
- `socket_disconnections_total` - Total disconnections
- `socket_events_total{event_type}` - Events by type
- `socket_event_duration_seconds{event_type}` - Event handler duration

### Message Metrics

- `messages_total{message_type}` - Messages sent by type
- `message_delivery_time_seconds{message_type}` - Delivery latency
- `messages_delivered_total` - Total delivered messages
- `messages_seen_total` - Total seen messages

### HTTP Metrics

- `http_requests_total{method,route,status_code}` - Request count
- `http_request_duration_seconds{method,route,status_code}` - Request duration

### User Metrics

- `users_online` - Current online users
- `users_total` - Total registered users

### System Metrics (Auto-collected)

- `process_cpu_seconds_total` - CPU time
- `process_resident_memory_bytes` - Memory usage
- `nodejs_heap_size_bytes` - Node.js heap size
- `nodejs_eventloop_lag_seconds` - Event loop lag

## Query Examples

### Message throughput over time
```promql
rate(messages_total[1m])
```

### Average message delivery time
```promql
rate(message_delivery_time_seconds_sum[5m]) / rate(message_delivery_time_seconds_count[5m])
```

### Socket connection growth
```promql
rate(socket_connections_total[1h])
```

### Error rate
```promql
rate(errors_total[5m])
```

### API latency (p95)
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Troubleshooting

### Prometheus can't reach backend

**Problem**: Prometheus shows "DOWN" for relaymesh-backend target

**Solution**:
- If running backend on host (not Docker), use `host.docker.internal:7100`
- Check that your backend has `/metrics` endpoint exposed
- Verify backend is running: `curl http://localhost:7100/metrics`

### No data in Grafana

**Problem**: Dashboards show no data

**Solution**:
- Check Prometheus is scraping: http://localhost:9090/targets
- Ensure backend is sending metrics: `curl http://localhost:7100/metrics`
- Wait 30 seconds after first request (metrics need time to accumulate)

### Reset Grafana password

```bash
docker exec -it relaymesh-grafana grafana-cli admin reset-admin-password newpassword
```

### View Prometheus logs

```bash
docker logs relaymesh-prometheus
```

### Stop monitoring stack

```bash
cd backend
docker-compose down
```

### Remove all monitoring data

```bash
cd backend
docker-compose down -v
```

## Production Deployment

For production:

1. **Security**:
   - Change Grafana admin password
   - Use authentication/authorization
   - Restrict Prometheus to internal network
   - Use HTTPS

2. **Performance**:
   - Increase Prometheus retention (currently 30d)
   - Use external storage (S3, GCS)
   - Implement service mesh monitoring

3. **Alerting**:
   - Configure alert rules in Prometheus
   - Set up notification channels (Slack, PagerDuty)
   - Create runbooks for alerts

4. **Scaling**:
   - Use remote storage backends
   - Implement Prometheus federation
   - Deploy Grafana in HA mode

## Next Steps

1. ✅ Create custom dashboards based on your needs
2. ✅ Set up alert rules and notifications
3. ✅ Integrate with your CI/CD pipeline
4. ✅ Add custom metrics for business logic
5. ✅ Document SLOs and error budgets

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [prom-client](https://github.com/siimon/prom-client)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)

## File Structure

```
backend/
├── docker-compose.yml                          # Docker setup
├── prometheus.yml                              # Prometheus config
├── src/
│   ├── app.js                                  # (update needed)
│   ├── socket.js                               # (update needed)
│   ├── metrics/
│   │   └── prometheus.js                       # Metrics definitions
│   ├── middlewares/
│   │   └── metrics.middleware.js               # HTTP metrics
│   ├── routes/
│   │   └── metrics.routes.js                   # /metrics endpoint
│   └── utils/
│       └── socket-metrics.js                   # Socket.io metrics
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml                  # Prometheus datasource
        └── dashboards/
            ├── dashboard.yml                   # Dashboard provisioning
            └── relaymesh-dashboard.json        # Dashboard JSON
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Prometheus targets page: http://localhost:9090/targets
3. Check metrics endpoint: http://localhost:7100/metrics
4. Review Docker logs: `docker-compose logs -f`
