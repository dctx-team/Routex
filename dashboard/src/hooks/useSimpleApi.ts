import { useCallback } from 'react';
import type { Channel, LoadBalancerStrategy } from '../types';

/**
 * 简化版 API 调用 Hook
 * 作为迁移阶段的临时解决方案，提供基础的 API 调用功能
 * 后续可以逐步迁移到完整的 React Query 架构
 */
export const useSimpleApi = (apiBase: string, showToast: (message: string, type?: 'success' | 'error') => void) => {
  // 通用请求包装器
  const request = useCallback(async (url: string, options?: RequestInit) => {
    try {
      const response = await fetch(`${apiBase}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(errorMessage, 'error');
      throw error;
    }
  }, [apiBase, showToast]);

  // 数据加载方法
  const loadData = useCallback(async () => {
    try {
      const [statusRes, channelsRes] = await Promise.all([
        fetch(`${apiBase}`),
        fetch(`${apiBase}/channels`),
      ]);

      if (!statusRes.ok || !channelsRes.ok) {
        throw new Error('Failed to load data');
      }

      const statusData = await statusRes.json();
      const channelsData = await channelsRes.json();

      return {
        status: statusData,
        channels: channelsData.data || [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(errorMessage, 'error');
      throw error;
    }
  }, [apiBase, showToast]);

  // 渠道管理方法
  const saveChannel = useCallback(async (channelData: Channel, editingChannel: Channel | null) => {
    const isEdit = !!editingChannel;
    const url = isEdit ? `/channels/${editingChannel!.name}` : '/channels';
    const method = isEdit ? 'PUT' : 'POST';

    await request(url, {
      method,
      body: JSON.stringify(channelData),
    });

    showToast(isEdit ? 'Channel updated' : 'Channel created');
  }, [request, showToast]);

  const deleteChannel = useCallback(async (name: string) => {
    if (!confirm(`Are you sure you want to delete channel "${name}"?`)) {
      return;
    }

    await request(`/channels/${name}`, {
      method: 'DELETE',
    });

    showToast('Channel deleted');
  }, [request, showToast]);

  const toggleChannel = useCallback(async (channel: Channel) => {
    const newStatus = channel.status === 'enabled' ? 'disabled' : 'enabled';

    await request(`/channels/${channel.name}`, {
      method: 'PUT',
      body: JSON.stringify({ ...channel, status: newStatus }),
    });

    showToast(`Channel ${newStatus === 'enabled' ? 'enabled' : 'disabled'}`);
  }, [request, showToast]);

  // 策略管理方法
  const changeStrategy = useCallback(async (strategy: LoadBalancerStrategy) => {
    await request('/strategy', {
      method: 'PUT',
      body: JSON.stringify({ strategy }),
    });

    showToast('Load balancer strategy updated');
  }, [request, showToast]);

  return {
    loadData,
    saveChannel,
    deleteChannel,
    toggleChannel,
    changeStrategy,
    request,
  };
};