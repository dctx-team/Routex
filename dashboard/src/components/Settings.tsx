import React, { useState, useEffect } from 'react';
import { t, type Locale } from '../i18n';

interface SettingsProps {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

interface SystemSettings {
  port?: number;
  host?: string;
  logLevel?: string;
  corsEnabled?: boolean;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number;
  rateLimitWindow?: number;
  cachingEnabled?: boolean;
  tracingEnabled?: boolean;
  metricsEnabled?: boolean;
}

export function Settings({ apiBase, showToast, locale = 'en' }: SettingsProps) {
  const [settings, setSettings] = useState<SystemSettings>({});
  const [editedSettings, setEditedSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load settings from various endpoints
      const response = await fetch(`${apiBase}/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || {});
        setEditedSettings(data.data || {});
      } else {
        // If no settings endpoint, show default values
        const defaultSettings: SystemSettings = {
          port: 3000,
          host: '0.0.0.0',
          logLevel: 'info',
          corsEnabled: true,
          rateLimitEnabled: false,
          rateLimitMax: 100,
          rateLimitWindow: 60000,
          cachingEnabled: true,
          tracingEnabled: false,
          metricsEnabled: true,
        };
        setSettings(defaultSettings);
        setEditedSettings(defaultSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'settings.failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [apiBase]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${apiBase}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSettings),
      });

      if (!response.ok) throw new Error(t(locale, 'settings.failedSave'));

      showToast(t(locale, 'settings.saved'), 'success');
      setSettings(editedSettings);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'settings.failedSave'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedSettings({ ...settings });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="spinner"></div>
          <span className="ml-3 text-gray-600">{t(locale, 'settings.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-l-4 border-red-500">
        <h3 className="text-red-800 font-semibold mb-2">{t(locale, 'settings.errorLoading')}</h3>
        <p className="text-red-600">{error}</p>
        <button onClick={loadSettings} className="btn btn-danger mt-4">
          {t(locale, 'settings.retry')}
        </button>
      </div>
    );
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(editedSettings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{t(locale, 'settings.title')}</h2>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="btn btn-secondary"
            disabled={!hasChanges || saving}
          >
            {t(locale, 'settings.resetChanges')}
          </button>
          <button
            onClick={handleSaveSettings}
            className="btn btn-primary"
            disabled={!hasChanges || saving}
          >
            {saving ? t(locale, 'settings.saving') : t(locale, 'settings.saveChanges')}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="card bg-yellow-50 border-l-4 border-yellow-500">
          <p className="text-yellow-800 text-sm">
            {t(locale, 'settings.unsavedWarning')}
          </p>
        </div>
      )}

      {/* Server Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          {t(locale, 'settings.serverConfig')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'settings.port')}</label>
            <input
              type="number"
              value={editedSettings.port || 3000}
              onChange={(e) => setEditedSettings({ ...editedSettings, port: parseInt(e.target.value) })}
              className="input"
              min="1"
              max="65535"
            />
            <p className="text-xs text-gray-500 mt-1">{t(locale, 'settings.portDesc')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'settings.host')}</label>
            <input
              type="text"
              value={editedSettings.host || '0.0.0.0'}
              onChange={(e) => setEditedSettings({ ...editedSettings, host: e.target.value })}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">{t(locale, 'settings.hostDesc')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'settings.logLevel')}</label>
            <select
              value={editedSettings.logLevel || 'info'}
              onChange={(e) => setEditedSettings({ ...editedSettings, logLevel: e.target.value })}
              className="select"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">{t(locale, 'settings.logLevelDesc')}</p>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          {t(locale, 'settings.featureToggles')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">{t(locale, 'settings.cors')}</h4>
              <p className="text-sm text-gray-600">{t(locale, 'settings.corsDesc')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editedSettings.corsEnabled ?? true}
                onChange={(e) => setEditedSettings({ ...editedSettings, corsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">{t(locale, 'settings.caching')}</h4>
              <p className="text-sm text-gray-600">{t(locale, 'settings.cachingDesc')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editedSettings.cachingEnabled ?? true}
                onChange={(e) => setEditedSettings({ ...editedSettings, cachingEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">{t(locale, 'settings.tracingFeature')}</h4>
              <p className="text-sm text-gray-600">{t(locale, 'settings.tracingDesc')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editedSettings.tracingEnabled ?? false}
                onChange={(e) => setEditedSettings({ ...editedSettings, tracingEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">{t(locale, 'settings.metricsFeature')}</h4>
              <p className="text-sm text-gray-600">{t(locale, 'settings.metricsDesc')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editedSettings.metricsEnabled ?? true}
                onChange={(e) => setEditedSettings({ ...editedSettings, metricsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200">
          {t(locale, 'settings.rateLimiting')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">{t(locale, 'settings.enableRateLimit')}</h4>
              <p className="text-sm text-gray-600">{t(locale, 'settings.rateLimitDesc')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editedSettings.rateLimitEnabled ?? false}
                onChange={(e) => setEditedSettings({ ...editedSettings, rateLimitEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {editedSettings.rateLimitEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'settings.maxRequests')}</label>
                <input
                  type="number"
                  value={editedSettings.rateLimitMax || 100}
                  onChange={(e) => setEditedSettings({ ...editedSettings, rateLimitMax: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">{t(locale, 'settings.maxRequestsDesc')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'settings.window')}</label>
                <input
                  type="number"
                  value={editedSettings.rateLimitWindow || 60000}
                  onChange={(e) => setEditedSettings({ ...editedSettings, rateLimitWindow: parseInt(e.target.value) })}
                  className="input"
                  min="1000"
                />
                <p className="text-xs text-gray-500 mt-1">{t(locale, 'settings.windowDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="card bg-blue-50 border-l-4 border-blue-500">
        <h3 className="text-blue-800 font-semibold mb-2">{t(locale, 'settings.configNotes')}</h3>
        <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
          <li>{t(locale, 'settings.note1')}</li>
          <li>{t(locale, 'settings.note2')}</li>
          <li>{t(locale, 'settings.note3')}</li>
          <li>{t(locale, 'settings.note4')}</li>
        </ul>
      </div>
    </div>
  );
}
