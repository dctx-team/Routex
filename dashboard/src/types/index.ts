export interface Channel {
  name: string;
  type: 'anthropic' | 'openai' | 'google' | 'custom';
  baseURL: string;
  apiKey: string;
  models?: string[];
  priority: number;
  weight: number;
  status: 'enabled' | 'disabled';
}

export interface SystemStatus {
  version: string;
  uptime: number;
  loadBalancer: {
    strategy: 'priority' | 'round_robin' | 'weighted' | 'least_used';
    cacheStats: {
      size: number;
      maxSize: number;
      utilizationPercent: number;
    };
  };
  stats: {
    totalChannels: number;
    enabledChannels: number;
    routingRules: number;
    transformers: number;
  };
  endpoints: Record<string, string>;
}

export interface ChannelFormData {
  name: string;
  type: Channel['type'];
  baseURL: string;
  apiKey: string;
  models: string;
  priority: number;
  weight: number;
  status: Channel['status'];
}

export type LoadBalancerStrategy = 'priority' | 'round_robin' | 'weighted' | 'least_used';
