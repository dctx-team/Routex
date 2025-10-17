import React, { useState, useEffect } from 'react';
import type { SystemStatus, Channel, LoadBalancerStrategy } from './types';
import { Dashboard } from './components/Dashboard';
import { ChannelList } from './components/ChannelList';
import { ChannelModal } from './components/ChannelModal';
import { Toast } from './components/Toast';

const API_BASE = import.meta.env.DEV ? '/api' : window.location.origin + '/api';

function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateChannel = () => {
    setEditingChannel(null);
    setShowModal(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingChannel(null);
  };

  const handleSaveChannel = async (channelData: Channel) => {
    try {
      const isEdit = !!editingChannel;
      const url = isEdit
        ? `${API_BASE}/channels/${editingChannel.name}`
        : `${API_BASE}/channels`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save channel: ${response.statusText}`);
      }

      showToast(isEdit ? '渠道已更新' : '渠道已创建');
      handleCloseModal();
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };

  const handleDeleteChannel = async (name: string) => {
    if (!confirm(`确定要删除渠道 "${name}" 吗？`)) return;

    try {
      const response = await fetch(`${API_BASE}/channels/${name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete channel');
      }

      showToast('渠道已删除');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const handleToggleChannel = async (channel: Channel) => {
    try {
      const newStatus = channel.status === 'enabled' ? 'disabled' : 'enabled';
      const response = await fetch(`${API_BASE}/channels/${channel.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...channel, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle channel');
      }

      showToast(`渠道已${newStatus === 'enabled' ? '启用' : '禁用'}`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to toggle', 'error');
    }
  };

  const handleChangeStrategy = async (strategy: LoadBalancerStrategy) => {
    try {
      const response = await fetch(`${API_BASE}/strategy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });

      if (!response.ok) {
        throw new Error('Failed to change strategy');
      }

      showToast('负载均衡策略已更新');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change strategy', 'error');
    }
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">正在加载...</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-500 text-white rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold mb-2">加载失败</h2>
          <p>{error}</p>
          <button onClick={loadData} className="btn btn-secondary mt-4">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {status && (
          <>
            <Dashboard
              status={status}
              onRefresh={loadData}
              onCreateChannel={handleCreateChannel}
              onChangeStrategy={handleChangeStrategy}
            />
            <ChannelList
              channels={channels}
              onEdit={handleEditChannel}
              onDelete={handleDeleteChannel}
              onToggle={handleToggleChannel}
            />
          </>
        )}

        {showModal && (
          <ChannelModal
            channel={editingChannel}
            onClose={handleCloseModal}
            onSave={handleSaveChannel}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} />}

        <footer className="text-center text-white mt-12 pb-4">
          <p className="text-sm">
            Routex © 2025 |{' '}
            <a
              href="https://github.com/dctx-team/Routex"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary-200"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
