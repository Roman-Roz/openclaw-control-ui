const si = require('systeminformation');
const logger = require('../utils/logger');

class MonitoringService {
  constructor() {
    this.metricsHistory = [];
    this.maxHistoryLength = 100;
    this.alerts = [];
    this.thresholds = {
      cpu: 80,
      memory: 85,
      disk: 90
    };
  }

  async getSystemMetrics() {
    try {
      const [cpu, mem, disk, network, osInfo] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.osInfo()
      ]);

      const metrics = {
        timestamp: new Date(),
        cpu: {
          usage: cpu.currentLoad,
          cores: cpu.cpus,
          temperature: cpu.temperature?.main || null
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usagePercent: ((mem.used / mem.total) * 100).toFixed(2)
        },
        disk: disk.map(d => ({
          fs: d.fs,
          mount: d.mount,
          size: d.size,
          used: d.used,
          available: d.available,
          usagePercent: ((d.used / d.size) * 100).toFixed(2)
        })),
        network: {
          rx_bytes: network.reduce((acc, n) => acc + n.rx_bytes, 0),
          tx_bytes: network.reduce((acc, n) => acc + n.tx_bytes, 0),
          interfaces: network.map(n => ({
            iface: n.iface,
            rx_bytes: n.rx_bytes,
            tx_bytes: n.tx_bytes
          }))
        },
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          hostname: osInfo.hostname,
          uptime: osInfo.uptime
        }
      };

      // Сохраняем историю
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistoryLength) {
        this.metricsHistory.shift();
      }

      // Проверка на превышение порогов
      this.checkAlerts(metrics);

      return metrics;
    } catch (error) {
      logger.error(`Error getting system metrics: ${error.message}`);
      throw error;
    }
  }

  checkAlerts(metrics) {
    const alerts = [];

    if (metrics.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'CPU_HIGH',
        message: `CPU usage is ${metrics.cpu.usage.toFixed(1)}%`,
        severity: 'warning',
        timestamp: new Date()
      });
    }

    if (parseFloat(metrics.memory.usagePercent) > this.thresholds.memory) {
      alerts.push({
        type: 'MEMORY_HIGH',
        message: `Memory usage is ${metrics.memory.usagePercent}%`,
        severity: 'warning',
        timestamp: new Date()
      });
    }

    metrics.disk.forEach(disk => {
      if (parseFloat(disk.usagePercent) > this.thresholds.disk) {
        alerts.push({
          type: 'DISK_HIGH',
          message: `Disk ${disk.mount} usage is ${disk.usagePercent}%`,
          severity: 'critical',
          timestamp: new Date()
        });
      }
    });

    if (alerts.length > 0) {
      this.alerts = [...this.alerts, ...alerts];
      // Храним только последние 50 алертов
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
      
      alerts.forEach(alert => {
        logger.warn(`[ALERT] ${alert.type}: ${alert.message}`);
      });
    }

    return alerts;
  }

  getMetricsHistory(hours = 1) {
    const now = Date.now();
    const msInHour = 3600000;
    return this.metricsHistory.filter(m => 
      now - new Date(m.timestamp).getTime() < hours * msInHour
    );
  }

  getAlerts(limit = 20) {
    return this.alerts.slice(-limit);
  }

  clearAlerts() {
    this.alerts = [];
  }

  setThreshold(metric, value) {
    if (this.thresholds.hasOwnProperty(metric)) {
      this.thresholds[metric] = value;
      logger.info(`Threshold updated: ${metric} = ${value}`);
      return true;
    }
    return false;
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  async getProcesses() {
    try {
      const processes = await si.processes();
      return {
        count: processes.list.length,
        top: processes.list
          .sort((a, b) => b.mem - a.mem)
          .slice(0, 10)
          .map(p => ({
            pid: p.pid,
            name: p.name,
            cpu: p.pcpu,
            memory: p.mem,
            user: p.user
          }))
      };
    } catch (error) {
      logger.error(`Error getting processes: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new MonitoringService();
