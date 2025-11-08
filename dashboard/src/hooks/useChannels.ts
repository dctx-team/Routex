/**
 * 自定义 Hooks - Channels 数据管理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Channel } from '../types';

const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';

// 获取所有频道
export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/channels`);
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 30000, // 30秒内数据视为新鲜
    refetchOnWindowFocus: true,
  });
}

// 获取单个频道
export function useChannel(id: string) {
  return useQuery({
    queryKey: ['channel', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/channels/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch channel ${id}`);
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

// 创建频道
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelData: Omit<Channel, 'id'>) => {
      const response = await fetch(`${API_BASE}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create channel');
      }

      return response.json();
    },
    onSuccess: () => {
      // 创建成功后，使频道列表缓存失效
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// 更新频道
export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Channel> }) => {
      const response = await fetch(`${API_BASE}/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update channel');
      }

      return response.json();
    },
    onMutate: async ({ id, data }) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ['channels'] });
      await queryClient.cancelQueries({ queryKey: ['channel', id] });

      // 保存旧数据
      const previousChannels = queryClient.getQueryData(['channels']);

      // 乐观更新
      queryClient.setQueryData(['channels'], (old: Channel[] | undefined) => {
        if (!old) return old;
        return old.map((ch) => (ch.name === id ? { ...ch, ...data } : ch));
      });

      return { previousChannels };
    },
    onError: (_err, _variables, context) => {
      // 发生错误时回滚
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels'], context.previousChannels);
      }
    },
    onSettled: () => {
      // 无论成功还是失败，都重新获取数据
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// 删除频道
export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/channels/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete channel');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// 切换频道状态
export function useToggleChannel() {
  const updateMutation = useUpdateChannel();

  return {
    toggleChannel: async (channel: Channel) => {
      const newStatus = channel.status === 'enabled' ? 'disabled' : 'enabled';
      await updateMutation.mutateAsync({
        id: channel.name,
        data: { status: newStatus },
      });
    },
    isLoading: updateMutation.isPending,
  };
}
