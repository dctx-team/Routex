/**
 * UI 组件库统一导出
 */

// 基础组件
export { Button, type ButtonProps } from './Button';
export { Card, type CardProps } from './Card';
export { Badge, type BadgeProps } from './Badge';
export { Input, type InputProps } from './Input';
export { Select, type SelectProps } from './Select';

// 简洁UI组件
export { MetricCard } from './MetricCard';
export { StatusIndicator } from './StatusIndicator';
export { ActionCard } from './ActionCard';
export { QuickActions } from './QuickActions';

// 加载状态组件
export {
  SkeletonBox,
  SkeletonText,
  SkeletonCircle,
  SkeletonCard,
  SkeletonTable,
  SkeletonStatCard,
  SkeletonListItem,
  SkeletonDashboard,
  SkeletonChannelList,
  SkeletonLogList,
  SkeletonChart,
  SkeletonSettings,
  LoadingSpinner,
  FullPageLoader,
  ContentLoader,
} from './Skeleton';

export { FullPageLoader as LoadingSpinnerFallback, ErrorFallback } from './LoadingStates';

// 样式导入
import './index.css';
