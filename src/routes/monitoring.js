const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');
const { authenticate, requireRole } = require('./auth');

// GET /api/monitoring/metrics - Текущие метрики системы
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const metrics = await monitoringService.getSystemMetrics();
    res.json({ metrics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/monitoring/history - История метрик
router.get('/history', authenticate, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 1;
    const history = monitoringService.getMetricsHistory(hours);
    res.json({ history, count: history.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/monitoring/alerts - Список алертов
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const alerts = monitoringService.getAlerts(limit);
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/monitoring/alerts/clear - Очистить алерты (только admin)
router.post('/alerts/clear', authenticate, requireRole('admin'), (req, res) => {
  monitoringService.clearAlerts();
  res.json({ message: 'Alerts cleared' });
});

// GET /api/monitoring/thresholds - Текущие пороги
router.get('/thresholds', authenticate, (req, res) => {
  const thresholds = monitoringService.getThresholds();
  res.json({ thresholds });
});

// PUT /api/monitoring/thresholds - Обновить пороги (только admin)
router.put('/thresholds', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { metric, value } = req.body;
    
    if (!metric || value === undefined) {
      return res.status(400).json({ error: 'Metric and value required' });
    }

    const success = monitoringService.setThreshold(metric, parseFloat(value));
    if (!success) {
      return res.status(400).json({ error: 'Invalid metric name' });
    }

    res.json({ message: 'Threshold updated', thresholds: monitoringService.getThresholds() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/monitoring/processes - Топ процессов по памяти (только admin)
router.get('/processes', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const processes = await monitoringService.getProcesses();
    res.json({ processes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
