import { useCallback, useEffect, useRef } from 'react';
import type { SystemStatus, Channel } from '../types';
import {
  useStatus,
  useChannels,
  useLoading,
  useError,
  useRefreshInterval,
  useAppActions
} from '../store/app-store';

const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';

/**
 * 应用数据获取和管理 Hook
 * 负责获取系统状态和渠道数据，以及处理刷新逻辑
 */
export const useAppData = () => {
  const status = useStatus();
  const channels = useChannels();
  const loading = useLoading();
  const error = useError();
  const refreshInterval = useRefreshInterval();
  const { setStatus, setChannels, setLoading, setError } = useAppActions();

  // 使用 ref 来保存最新的回调函数引用
  const callbacksRef = useRef({
    setStatus,
    setChannels,
    setLoading,
    setError,
  });

  // 更新 ref 引用
  useEffect(() => {
    callbacksRef.current = {
      setStatus,
      setChannels,
      setLoading,
      setError,
    };
  }, [setStatus, setChannels, setLoading, setError]);

  // 加载数据的核心函数
  const loadData = useCallback(async () => {
    try {
      const { setLoading, setError, setStatus, setChannels } = callbacksRef.current;

      setLoading(true);
      setError(null);

      const [statusRes, channelsRes] = await Promise.all([
        fetch(`${API_BASE}`),
        fetch(`${API_BASE}/channels`),
      ]);

      if (!statusRes.ok || !channelsRes.ok) {
        throw new Error('Failed to load data');
      }

      const statusData = await statusRes.json();
      const channelsData = await channelsRes.json();

      setStatus(statusData);
      setChannels(channelsData.data || []);
    } catch (err) {
      const { setError } = callbacksRef.current;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      const { setLoading } = callbacksRef.current;
      setLoading(false);
    }
  }, []);

  // 初始加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 设置定时刷新
  useEffect(() => {
    if (refreshInterval === 0) return;

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, loadData]);

  return {
    status,
    channels,
    loading,
    error,
    loadData,
  };
};