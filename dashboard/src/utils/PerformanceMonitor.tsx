import React, { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  reRenderCount: number;
  memoryUsage?: number;
  componentMountTime: number;
  lastUpdateTime: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  children: React.ReactNode;
  enableLogging?: boolean;
}

/**
 * 性能监控组件
 * 用于监控 React 组件的性能指标
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  children,
  enableLogging = import.meta.env.DEV,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    reRenderCount: 0,
    componentMountTime: 0,
    lastUpdateTime: Date.now(),
  });

  const renderStartRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // 记录组件挂载时间
    const mountTime = Date.now() - mountTimeRef.current;

    setMetrics(prev => ({
      ...prev,
      componentMountTime: mountTime,
      reRenderCount: prev.reRenderCount + 1,
    }));

    if (enableLogging) {
      console.log(`📊 [${componentName}] Mount time: ${mountTime}ms`);
    }

    // 监听内存使用（如果支持）
    if ('memory' in performance) {
      const memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
      }));
    }
  });

  // 记录渲染开始时间
  renderStartRef.current = performance.now();

  useEffect(() => {
    // 记录渲染结束时间
    const renderTime = performance.now() - renderStartRef.current;

    setMetrics(prev => ({
      ...prev,
      renderTime: Math.round(renderTime * 100) / 100,
      lastUpdateTime: Date.now(),
    }));

    if (enableLogging && renderTime > 16) { // 超过一帧时间的渲染
      console.warn(`⚠️ [${componentName}] Slow render: ${renderTime}ms`);
    }
  });

  return (
    <>
      {children}
      {enableLogging && import.meta.env.DEV && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
          <div>📊 {componentName}</div>
          <div>Render: {metrics.renderTime}ms</div>
          <div>Rerenders: {metrics.reRenderCount}</div>
          {metrics.memoryUsage && <div>Memory: {metrics.memoryUsage}MB</div>}
        </div>
      )}
    </>
  );
};

/**
 * 性能对比 Hook
 * 用于对比不同版本的性能
 */
export const usePerformanceComparison = (componentName: string) => {
  const [originalMetrics, setOriginalMetrics] = useState<PerformanceMetrics | null>(null);
  const [refactoredMetrics, setRefactoredMetrics] = useState<PerformanceMetrics | null>(null);

  const recordOriginalMetrics = (metrics: PerformanceMetrics) => {
    setOriginalMetrics(metrics);
  };

  const recordRefactoredMetrics = (metrics: PerformanceMetrics) => {
    setRefactoredMetrics(metrics);
  };

  const getComparison = () => {
    if (!originalMetrics || !refactoredMetrics) {
      return null;
    }

    const renderImprovement = ((originalMetrics.renderTime - refactoredMetrics.renderTime) / originalMetrics.renderTime) * 100;
    const mountImprovement = ((originalMetrics.componentMountTime - refactoredMetrics.componentMountTime) / originalMetrics.componentMountTime) * 100;
    const memoryImprovement = originalMetrics.memoryUsage && refactoredMetrics.memoryUsage
      ? ((originalMetrics.memoryUsage - refactoredMetrics.memoryUsage) / originalMetrics.memoryUsage) * 100
      : null;

    return {
      renderImprovement: Math.round(renderImprovement * 100) / 100,
      mountImprovement: Math.round(mountImprovement * 100) / 100,
      memoryImprovement: memoryImprovement ? Math.round(memoryImprovement * 100) / 100 : null,
      originalMetrics,
      refactoredMetrics,
    };
  };

  return {
    originalMetrics,
    refactoredMetrics,
    recordOriginalMetrics,
    recordRefactoredMetrics,
    getComparison,
  };
};

/**
 * 全局性能监控器
 */
export const GlobalPerformanceMonitor: React.FC = () => {
  const [fps, setFps] = useState<number>(0);
  const [longTasks, setLongTasks] = useState<number[]>([]);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let animationId: number;

    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();

      if (currentTime - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (currentTime - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    measureFPS();

    // 监听长任务
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) { // 超过50ms的任务
            setLongTasks(prev => [...prev, entry.duration]);
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="text-green-400">FPS: {fps}</div>
      <div className="text-yellow-400">Long Tasks: {longTasks.length}</div>
      {longTasks.length > 0 && (
        <div className="text-red-400">
          Max: {Math.max(...longTasks)}ms
        </div>
      )}
    </div>
  );
};