interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return this.metrics;
  }

  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  getSuccessRate(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;
    
    const successful = operationMetrics.filter(m => m.success).length;
    return (successful / operationMetrics.length) * 100;
  }

  getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  clear() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Performance decorator for functions
export function measurePerformance(operation: string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const start = performance.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        throw err;
      } finally {
        const end = performance.now();
        const duration = end - start;

        performanceMonitor.recordMetric({
          operation,
          duration,
          timestamp: Date.now(),
          success,
          error
        });
      }
    };

    return descriptor;
  };
}

// Performance wrapper for async functions
export function withPerformanceMonitoring<T extends unknown[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const start = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const end = performance.now();
      const duration = end - start;

      performanceMonitor.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success,
        error
      });
    }
  };
}

// Performance monitoring for API routes
export function monitorApiPerformance(operation: string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (request: Request, ...args: unknown[]) {
      const start = performance.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await method.apply(this, [request, ...args]);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        throw err;
      } finally {
        const end = performance.now();
        const duration = end - start;

        performanceMonitor.recordMetric({
          operation,
          duration,
          timestamp: Date.now(),
          success,
          error
        });
      }
    };

    return descriptor;
  };
}

// Get performance statistics
export function getPerformanceStats() {
  const allMetrics = performanceMonitor.getMetrics();
  const recentMetrics = performanceMonitor.getRecentMetrics(5); // Last 5 minutes

  const operations = ['login', 'register', 'logout', 'profile_update', 'password_reset'];
  const stats: Record<string, unknown> = {};

  operations.forEach(operation => {
    const operationMetrics = performanceMonitor.getMetrics(operation);
    const recentOperationMetrics = recentMetrics.filter(m => m.operation === operation);

    stats[operation] = {
      totalRequests: operationMetrics.length,
      recentRequests: recentOperationMetrics.length,
      averageDuration: performanceMonitor.getAverageDuration(operation),
      successRate: performanceMonitor.getSuccessRate(operation),
      recentAverageDuration: recentOperationMetrics.length > 0 
        ? recentOperationMetrics.reduce((sum, m) => sum + m.duration, 0) / recentOperationMetrics.length 
        : 0,
    };
  });

  return {
    overall: {
      totalRequests: allMetrics.length,
      recentRequests: recentMetrics.length,
      averageDuration: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.duration, 0) / allMetrics.length 
        : 0,
      successRate: allMetrics.length > 0 
        ? (allMetrics.filter(m => m.success).length / allMetrics.length) * 100 
        : 0,
    },
    operations: stats
  };
}

// Log performance metrics periodically
setInterval(() => {
  const stats = getPerformanceStats();
  console.log('[PERFORMANCE] Stats:', JSON.stringify(stats, null, 2));
}, 5 * 60 * 1000); // Log every 5 minutes
