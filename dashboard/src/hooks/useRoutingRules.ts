/**
 * 自定义 Hooks - 路由规则管理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RoutingRule } from '../types';

const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';

// 获取所有路由规则
export function useRoutingRules() {
  return useQuery({
    queryKey: ['routingRules'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/routing/rules`);
      if (!response.ok) {
        throw new Error('Failed to fetch routing rules');
      }
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 30000,
  });
}

// 创建路由规则
export function useCreateRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleData: Omit<RoutingRule, 'id'>) => {
      const response = await fetch(`${API_BASE}/routing/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (!response.ok) {
        throw new Error('Failed to create routing rule');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingRules'] });
    },
  });
}

// 更新路由规则
export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RoutingRule> }) => {
      const response = await fetch(`${API_BASE}/routing/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update routing rule');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingRules'] });
    },
  });
}

// 删除路由规则
export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/routing/rules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete routing rule');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routingRules'] });
    },
  });
}
