import express from 'express';
import { register_export } from '../metrics/prometheus.js';

const metricsRouter = express.Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 * Returns metrics in Prometheus text format
 */
metricsRouter.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register_export.contentType);
    res.end(await register_export.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

export { metricsRouter };
