/**
 * 虚拟滚动列表组件
 * Virtual Scrolling List Component
 *
 * 使用 react-window 优化长列表性能
 */

import React, { useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * 虚拟滚动列表属性
 */
export interface VirtualListProps<T> {
  /** 数据项数组 */
  items: T[];
  /** 每行高度（像素） */
  itemHeight: number;
  /** 渲染项的函数 */
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  /** 列表容器className */
  className?: string;
  /** 空状态组件 */
  emptyState?: React.ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 加载组件 */
  loadingComponent?: React.ReactNode;
}

/**
 * 虚拟滚动列表组件
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={channels}
 *   itemHeight={72}
 *   renderItem={(channel, index, style) => (
 *     <ChannelRow key={channel.name} channel={channel} style={style} />
 *   )}
 *   emptyState={<EmptyChannelsState />}
 * />
 * ```
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  emptyState,
  loading = false,
  loadingComponent,
}: VirtualListProps<T>) {
  // 渲染单个项的包装函数
  const Row = useMemo(
    () =>
      ({ index, style }: ListChildComponentProps) => {
        const item = items[index];
        return <div style={style}>{renderItem(item, index, style)}</div>;
      },
    [items, renderItem]
  );

  // 加载状态
  if (loading && loadingComponent) {
    return <div className={className}>{loadingComponent}</div>;
  }

  // 空状态
  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={`virtual-list ${className}`} style={{ height: '100%', minHeight: '400px' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width={width}
            overscanCount={5} // 预渲染额外的行数
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

/**
 * 虚拟化表格组件
 */
export interface VirtualTableProps<T> {
  items: T[];
  columns: {
    key: string;
    title: string;
    width?: number | string;
    render?: (item: T, index: number) => React.ReactNode;
  }[];
  rowHeight?: number;
  headerHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  emptyState?: React.ReactNode;
}

export function VirtualTable<T extends Record<string, any>>({
  items,
  columns,
  rowHeight = 48,
  headerHeight = 40,
  className = '',
  onRowClick,
  emptyState,
}: VirtualTableProps<T>) {
  const Row = useMemo(
    () =>
      ({ index, style }: ListChildComponentProps) => {
        const item = items[index];
        return (
          <div
            style={{
              ...style,
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #e5e7eb',
              cursor: onRowClick ? 'pointer' : 'default',
            }}
            onClick={() => onRowClick?.(item, index)}
            className="hover:bg-gray-50 transition-colors"
          >
            {columns.map((column) => (
              <div
                key={column.key}
                style={{
                  width: column.width || `${100 / columns.length}%`,
                  padding: '0 1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {column.render ? column.render(item, index) : item[column.key]}
              </div>
            ))}
          </div>
        );
      },
    [items, columns, onRowClick]
  );

  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={`virtual-table ${className}`} style={{ height: '100%', minHeight: '400px' }}>
      {/* 表头 */}
      <div
        style={{
          height: headerHeight,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          fontWeight: 600,
        }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            style={{
              width: column.width || `${100 / columns.length}%`,
              padding: '0 1rem',
            }}
          >
            {column.title}
          </div>
        ))}
      </div>

      {/* 虚拟滚动表格体 */}
      <div style={{ height: `calc(100% - ${headerHeight}px)` }}>
        <AutoSizer>
          {({ height, width }) => (
            <List height={height} itemCount={items.length} itemSize={rowHeight} width={width}>
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

/**
 * 虚拟化网格组件
 */
export interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyState?: React.ReactNode;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  gap = 16,
  renderItem,
  className = '',
  emptyState,
}: VirtualGridProps<T>) {
  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={`virtual-grid ${className}`} style={{ height: '100%', minHeight: '400px' }}>
      <AutoSizer>
        {({ height, width }) => {
          const itemsPerRow = Math.floor((width + gap) / (itemWidth + gap));
          const rowCount = Math.ceil(items.length / itemsPerRow);
          const rowHeight = itemHeight + gap;

          const Row = ({ index, style }: ListChildComponentProps) => {
            const startIndex = index * itemsPerRow;
            const endIndex = Math.min(startIndex + itemsPerRow, items.length);
            const rowItems = items.slice(startIndex, endIndex);

            return (
              <div
                style={{
                  ...style,
                  display: 'flex',
                  gap: `${gap}px`,
                  paddingLeft: gap / 2,
                  paddingRight: gap / 2,
                }}
              >
                {rowItems.map((item, i) => (
                  <div
                    key={startIndex + i}
                    style={{
                      width: itemWidth,
                      height: itemHeight,
                      flexShrink: 0,
                    }}
                  >
                    {renderItem(item, startIndex + i)}
                  </div>
                ))}
              </div>
            );
          };

          return (
            <List height={height} itemCount={rowCount} itemSize={rowHeight} width={width}>
              {Row}
            </List>
          );
        }}
      </AutoSizer>
    </div>
  );
}
