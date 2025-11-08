/**
 * 性能监控和用户体验验证工具
 */

interface PerformanceMetrics {
  // 加载性能
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift

  // 用户体验指标
  taskCompletionTime: number;
  navigationEfficiency: number;
  errorRate: number;
  mobileUsability: number;
}

interface UserInteraction {
  action: string;
  timestamp: number;
  duration: number;
  success: boolean;
  context: string;
}

/**
 * 性能监控类
 */
export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private interactions: UserInteraction[] = [];
  private startTime = performance.now();

  constructor() {
    this.initializePerformanceObserver();
  }

  /**
   * 初始化性能观察器
   */
  private initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // 监控FCP
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.fcp = fcpEntry.startTime;
        }
      }).observe({ entryTypes: ['paint'] });

      // 监控LCP
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lcpEntry = entries[entries.length - 1]; // 最后一个就是LCP
        if (lcpEntry) {
          this.metrics.lcp = lcpEntry.startTime;
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // 监控CLS
      new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });

      // 监控FID
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.metrics.fid = (entry as any).processingStart - entry.startTime;
        }
      }).observe({ entryTypes: ['first-input'] });
    }
  }

  /**
   * 记录用户交互
   */
  recordInteraction(action: string, duration: number, success: boolean, context: string = '') {
    this.interactions.push({
      action,
      timestamp: performance.now() - this.startTime,
      duration,
      success,
      context
    });

    // 计算任务完成时间
    this.calculateTaskCompletionTime();
  }

  /**
   * 计算任务完成时间
   */
  private calculateTaskCompletionTime() {
    const successfulTasks = this.interactions.filter(i => i.success);
    if (successfulTasks.length > 0) {
      const avgDuration = successfulTasks.reduce((sum, task) => sum + task.duration, 0) / successfulTasks.length;
      this.metrics.taskCompletionTime = Math.round(avgDuration);
    }
  }

  /**
   * 计算导航效率
   */
  calculateNavigationEfficiency(): number {
    // 基于交互次数和成功率的简单计算
    const totalInteractions = this.interactions.length;
    const successfulInteractions = this.interactions.filter(i => i.success).length;

    if (totalInteractions === 0) return 0;

    const successRate = successfulInteractions / totalInteractions;
    const efficiency = Math.round(successRate * 100);

    this.metrics.navigationEfficiency = efficiency;
    return efficiency;
  }

  /**
   * 评估移动端可用性
   */
  assessMobileUsability(): number {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return 100; // 桌面端不计入移动端评分

    let score = 100;

    // 检查触摸目标大小
    const touchTargets = document.querySelectorAll('button, a, input, select');
    let smallTargets = 0;

    touchTargets.forEach(target => {
      const rect = target.getBoundingClientRect();
      const minSize = 44; // 最小触摸目标44px
      if (rect.width < minSize || rect.height < minSize) {
        smallTargets++;
      }
    });

    if (touchTargets.length > 0) {
      const smallTargetRatio = smallTargets / touchTargets.length;
      score -= Math.round(smallTargetRatio * 30);
    }

    // 检查文字大小
    const bodyFontSize = parseFloat(window.getComputedStyle(document.body).fontSize);
    if (bodyFontSize < 16) {
      score -= 20;
    }

    // 检查水平滚动
    if (document.body.scrollWidth > document.body.clientWidth) {
      score -= 25;
    }

    this.metrics.mobileUsability = Math.max(0, score);
    return this.metrics.mobileUsability;
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceMetrics & { insights: string[] } {
    const report = {
      ...this.metrics,
      insights: this.generateInsights()
    } as PerformanceMetrics & { insights: string[] };

    return report;
  }

  /**
   * 生成性能洞察
   */
  private generateInsights(): string[] {
    const insights: string[] = [];

    // FCP分析
    if (this.metrics.fcp) {
      if (this.metrics.fcp < 1000) {
        insights.push('✅ 首次内容绘制时间优秀 (< 1s)');
      } else if (this.metrics.fcp < 2500) {
        insights.push('⚠️ 首次内容绘制时间良好 (1-2.5s)');
      } else {
        insights.push('❌ 首次内容绘制时间需要优化 (> 2.5s)');
      }
    }

    // LCP分析
    if (this.metrics.lcp) {
      if (this.metrics.lcp < 2500) {
        insights.push('✅ 最大内容绘制时间优秀 (< 2.5s)');
      } else if (this.metrics.lcp < 4000) {
        insights.push('⚠️ 最大内容绘制时间良好 (2.5-4s)');
      } else {
        insights.push('❌ 最大内容绘制时间需要优化 (> 4s)');
      }
    }

    // 任务完成时间分析
    if (this.metrics.taskCompletionTime) {
      if (this.metrics.taskCompletionTime < 3000) {
        insights.push('✅ 任务完成时间优秀 (< 3s)');
      } else if (this.metrics.taskCompletionTime < 5000) {
        insights.push('⚠️ 任务完成时间良好 (3-5s)');
      } else {
        insights.push('❌ 任务完成时间需要优化 (> 5s)');
      }
    }

    // 移动端可用性分析
    if (this.metrics.mobileUsability) {
      if (this.metrics.mobileUsability >= 90) {
        insights.push('✅ 移动端可用性优秀');
      } else if (this.metrics.mobileUsability >= 70) {
        insights.push('⚠️ 移动端可用性良好');
      } else {
        insights.push('❌ 移动端可用性需要改进');
      }
    }

    return insights;
  }

  /**
   * 导出JSON报告
   */
  exportJSON(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  /**
   * 重置监控数据
   */
  reset() {
    this.metrics = {};
    this.interactions = [];
    this.startTime = performance.now();
  }
}

/**
 * 创建性能监控实例
 */
export const createPerformanceMonitor = (): PerformanceMonitor => {
  return new PerformanceMonitor();
};

/**
 * 便捷的性能测量装饰器
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  actionName: string,
  context: string = ''
): T {
  return ((...args: any[]) => {
    const startTime = performance.now();
    try {
      const result = fn(...args);

      // 异步函数处理
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          // 这里可以记录到全局监控器
          console.log(`[Performance] ${actionName}: ${duration.toFixed(2)}ms`);
        });
      }

      // 同步函数处理
      const duration = performance.now() - startTime;
      console.log(`[Performance] ${actionName}: ${duration.toFixed(2)}ms`);
      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[Performance] ${actionName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }) as T;
}