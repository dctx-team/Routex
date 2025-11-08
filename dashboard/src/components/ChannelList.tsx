import React, { useState } from 'react';
import type { Channel, ChannelTestResult } from '../types';
import { t, type Locale } from '../i18n';

interface ChannelListProps {
  channels: Channel[];
  onEdit: (channel: Channel) => void;
  onDelete: (name: string) => void;
  onToggle: (channel: Channel) => void;
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

export function ChannelList({ channels, onEdit, onDelete, onToggle, apiBase, showToast, locale = 'en' }: ChannelListProps) {
  const [testing, setTesting] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, ChannelTestResult>>({});

  const handleTestChannel = async (channel: Channel) => {
    try {
      setTesting(channel.name);
      const response = await fetch(`${apiBase}/channels/${channel.name}/test`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to test channel');
      const data = await response.json();
      const result = data.data as ChannelTestResult;

      setTestResults(prev => ({ ...prev, [channel.name]: result }));
      showToast(
        result.success
          ? t(locale, 'channels.testPassed').replace('{0}', channel.name).replace('{1}', result.latency?.toString() || '0')
          : t(locale, 'channels.testFailed').replace('{0}', channel.name).replace('{1}', result.error || ''),
        result.success ? 'success' : 'error'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to test channel', 'error');
    } finally {
      setTesting(null);
    }
  };

  const handleTestAll = async () => {
    try {
      setTestingAll(true);
      const response = await fetch(`${apiBase}/channels/test/all`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to test channels');
      const data = await response.json();
      const results = data.data.results as ChannelTestResult[];
      const summary = data.data.summary;

      const resultsMap: Record<string, ChannelTestResult> = {};
      results.forEach(result => {
        resultsMap[result.channelName] = result;
      });
      setTestResults(resultsMap);

      showToast(
        t(locale, 'channels.testSummary')
          .replace('{0}', summary.total.toString())
          .replace('{1}', summary.passed.toString())
          .replace('{2}', summary.failed.toString()),
        summary.failed === 0 ? 'success' : 'error'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to test channels', 'error');
    } finally {
      setTestingAll(false);
    }
  };

  if (channels.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 text-lg">{t(locale, 'channels.noChannels')}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{t(locale, 'channels.title')}</h2>
        <button
          onClick={handleTestAll}
          className="btn btn-primary"
          disabled={testingAll || channels.length === 0}
        >
          {testingAll ? t(locale, 'channels.testingAll') : t(locale, 'channels.testAll')}
        </button>
      </div>
      <div className="space-y-4">
        {channels.map((channel) => {
          const testResult = testResults[channel.name];
          return (
            <div
              key={channel.name}
              className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                channel.status === 'enabled'
                  ? 'bg-green-50 border-green-500'
                  : 'bg-gray-50 border-gray-400 opacity-60'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-800 text-lg">{channel.name}</h3>
                  {testResult && (
                    <span
                      className={`badge ${testResult.success ? 'badge-success' : 'badge-error'}`}
                      title={testResult.error || `${t(locale, 'channels.latency')}: ${testResult.latency}ms`}
                    >
                      {testResult.success ? `✓ ${testResult.latency}ms` : `✗ ${t(locale, 'channels.failed')}`}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1 space-x-4">
                  <span>{t(locale, 'channels.type')}: {channel.type}</span>
                  <span>{t(locale, 'channels.models')}: {channel.models?.join(', ') || t(locale, 'channels.allModels')}</span>
                  <span>{t(locale, 'routing.priority')}: {channel.priority}</span>
                  <span>{t(locale, 'channels.weight')}: {channel.weight}</span>
                  <span className={channel.status === 'enabled' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                    {channel.status === 'enabled' ? `✓ ${t(locale, 'routing.enabled')}` : `✗ ${t(locale, 'routing.disabled')}`}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTestChannel(channel)}
                  className="btn btn-secondary text-sm"
                  disabled={testing === channel.name}
                  title={t(locale, 'channels.test')}
                >
                  {testing === channel.name ? t(locale, 'channels.testing') : t(locale, 'channels.test')}
                </button>
                <button onClick={() => onEdit(channel)} className="btn btn-primary text-sm">
                  {t(locale, 'common.edit')}
                </button>
                <button
                  onClick={() => onToggle(channel)}
                  className={`btn text-sm ${channel.status === 'enabled' ? 'btn-secondary' : 'btn-success'}`}
                >
                  {channel.status === 'enabled' ? t(locale, 'routing.disable') : t(locale, 'routing.enable')}
                </button>
                <button onClick={() => onDelete(channel.name)} className="btn btn-danger text-sm">
                  {t(locale, 'common.delete')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
