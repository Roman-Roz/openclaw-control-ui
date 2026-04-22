const cron = require('node-cron');
const monitoringService = require('./monitoringService');
const wsManager = require('./websocketService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    this.isRunning = true;
    logger.info('Scheduler started');

    // Задача 1: Сбор метрик каждые 30 секунд
    this.scheduleJob('metrics-collector', '*/30 * * * * *', async () => {
      try {
        const metrics = await monitoringService.getSystemMetrics();
        
        // Отправляем метрики через WebSocket всем подключённым клиентам
        wsManager.broadcast({
          type: 'METRICS_UPDATE',
          payload: {
            cpu: metrics.cpu.usage,
            memory: parseFloat(metrics.memory.usagePercent),
            timestamp: metrics.timestamp
          }
        }, 'metrics');

        logger.debug('Metrics collected and broadcasted');
      } catch (error) {
        logger.error(`Metrics collection failed: ${error.message}`);
      }
    });

    // Задача 2: Проверка алертов каждую минуту
    this.scheduleJob('alerts-check', '* * * * *', () => {
      const alerts = monitoringService.getAlerts(5);
      if (alerts.length > 0) {
        const recentAlerts = alerts.filter(a => 
          Date.now() - new Date(a.timestamp).getTime() < 60000
        );
        
        if (recentAlerts.length > 0) {
          wsManager.broadcast({
            type: 'ALERT',
            payload: { alerts: recentAlerts }
          }, 'alerts');
          
          logger.warn(`Broadcasted ${recentAlerts.length} new alerts`);
        }
      }
    });

    // Задача 3: Очистка старых сессий каждый час
    this.scheduleJob('session-cleanup', '0 * * * *', () => {
      // Здесь можно добавить логику очистки старых сессий
      logger.debug('Session cleanup task executed');
    });

    // Задача 4: Ежедневный отчёт в 00:00
    this.scheduleJob('daily-report', '0 0 * * *', () => {
      const history = monitoringService.getMetricsHistory(24);
      const alerts = monitoringService.getAlerts(100);
      
      logger.info('Daily report generated', {
        metricsCollected: history.length,
        alertsTriggered: alerts.length,
        date: new Date().toISOString()
      });
    });

    // Задача 5: Ping Gateway каждые 5 минут
    this.scheduleJob('gateway-ping', '*/5 * * * *', async () => {
      try {
        const gatewayService = require('./gatewayService');
        const status = await gatewayService.checkStatus();
        
        wsManager.broadcast({
          type: 'GATEWAY_STATUS',
          payload: { available: status.available, latency: status.latency }
        }, 'system');
        
        logger.debug(`Gateway ping: ${status.available ? 'OK' : 'DOWN'}`);
      } catch (error) {
        logger.error(`Gateway ping failed: ${error.message}`);
      }
    });
  }

  scheduleJob(id, cronExpression, task) {
    try {
      const job = cron.schedule(cronExpression, task, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.jobs.set(id, job);
      logger.info(`Scheduled job registered: ${id} (${cronExpression})`);
      return true;
    } catch (error) {
      logger.error(`Failed to schedule job ${id}: ${error.message}`);
      return false;
    }
  }

  cancelJob(id) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
      logger.info(`Scheduled job cancelled: ${id}`);
      return true;
    }
    return false;
  }

  stop() {
    this.jobs.forEach((job, id) => {
      job.stop();
    });
    this.jobs.clear();
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobsCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    };
  }
}

module.exports = new SchedulerService();
