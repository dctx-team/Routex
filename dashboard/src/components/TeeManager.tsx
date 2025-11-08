import React, { useState, useEffect } from 'react';
import type { TeeDestination } from '../types';
import { t, type Locale } from '../i18n';

interface TeeManagerProps {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

export function TeeManager({ apiBase, showToast, locale = 'en' }: TeeManagerProps) {
  const [destinations, setDestinations] = useState<TeeDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<TeeDestination | null>(null);
  const [formData, setFormData] = useState<Partial<TeeDestination>>({
    name: '',
    type: 'http',
    enabled: true,
    url: '',
    method: 'POST',
    headers: {},
    retries: 3,
    timeout: 5000,
  });

  const loadDestinations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/tee`);
      if (!response.ok) throw new Error(t(locale, 'tee.failedLoad'));
      const data = await response.json();
      setDestinations(data.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tee.failedLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  const handleCreate = () => {
    setEditingDestination(null);
    setFormData({
      name: '',
      type: 'http',
      enabled: true,
      url: '',
      method: 'POST',
      headers: {},
      retries: 3,
      timeout: 5000,
    });
    setShowModal(true);
  };

  const handleEdit = (destination: TeeDestination) => {
    setEditingDestination(destination);
    setFormData(destination);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const isEdit = !!editingDestination;
      const url = isEdit
        ? `${apiBase}/tee/${editingDestination.id}`
        : `${apiBase}/tee`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(t(locale, 'tee.failedSave'));
      showToast(isEdit ? t(locale, 'tee.updated') : t(locale, 'tee.created'));
      setShowModal(false);
      await loadDestinations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tee.failedSave'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t(locale, 'tee.confirmDelete'))) return;
    try {
      const response = await fetch(`${apiBase}/tee/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(t(locale, 'tee.failedDelete'));
      showToast(t(locale, 'tee.deleted'));
      await loadDestinations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tee.failedDelete'), 'error');
    }
  };

  const handleToggle = async (destination: TeeDestination) => {
    try {
      const response = await fetch(`${apiBase}/tee/${destination.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...destination, enabled: !destination.enabled }),
      });
      if (!response.ok) throw new Error(t(locale, 'tee.failedToggle'));
      showToast(t(locale, 'tee.toggled').replace('{0}', !destination.enabled ? t(locale, 'tee.enabled') : t(locale, 'tee.disabled')));
      await loadDestinations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'tee.failedToggle'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="spinner mx-auto"></div>
        <p className="mt-4 text-gray-600">{t(locale, 'tee.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{t(locale, 'tee.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t(locale, 'tee.subtitle')}
            </p>
          </div>
          <button onClick={handleCreate} className="btn btn-primary">
            {t(locale, 'tee.createTarget')}
          </button>
        </div>

        {destinations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t(locale, 'tee.noTargets')}</p>
        ) : (
          <div className="space-y-4">
            {destinations.map((destination) => (
              <div
                key={destination.id}
                className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                  destination.enabled
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-gray-50 border-gray-400 opacity-60'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">{destination.name}</h3>
                    <span className="badge badge-info">{destination.type}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {destination.type === 'http' && destination.url && (
                      <div>{t(locale, 'tee.url')}: {destination.url}</div>
                    )}
                    {destination.type === 'file' && destination.filePath && (
                      <div>{t(locale, 'tee.filePath')}: {destination.filePath}</div>
                    )}
                    {destination.method && <div>{t(locale, 'tee.method')}: {destination.method}</div>}
                    <div className="flex items-center gap-4">
                      <span>{t(locale, 'tee.retries')}: {destination.retries || 0}</span>
                      <span>{t(locale, 'tee.timeout')}: {destination.timeout || 0}ms</span>
                      <span className={destination.enabled ? 'text-green-600 font-medium' : 'text-gray-500'}>
                        {destination.enabled ? t(locale, 'tee.enabled') : t(locale, 'tee.disabled')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(destination)}
                    className={`btn text-sm ${destination.enabled ? 'btn-secondary' : 'btn-success'}`}
                  >
                    {destination.enabled ? t(locale, 'common.disable') : t(locale, 'common.enable')}
                  </button>
                  <button onClick={() => handleEdit(destination)} className="btn btn-primary text-sm">
                    {t(locale, 'common.edit')}
                  </button>
                  <button onClick={() => handleDelete(destination.id)} className="btn btn-danger text-sm">
                    {t(locale, 'common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingDestination ? t(locale, 'tee.editTarget') : t(locale, 'tee.createTarget')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.name')}</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder={t(locale, 'tee.namePlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.type')}</label>
                  <select
                    value={formData.type || 'http'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TeeDestination['type'] })}
                    className="select"
                  >
                    <option value="http">HTTP</option>
                    <option value="webhook">Webhook</option>
                    <option value="file">File</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.status')}</label>
                  <select
                    value={formData.enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.value === 'enabled' })}
                    className="select"
                  >
                    <option value="enabled">{t(locale, 'tee.enabled')}</option>
                    <option value="disabled">{t(locale, 'tee.disabled')}</option>
                  </select>
                </div>
              </div>
              {(formData.type === 'http' || formData.type === 'webhook') && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.url')}</label>
                    <input
                      type="text"
                      value={formData.url || ''}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="input"
                      placeholder={t(locale, 'tee.urlPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.method')}</label>
                    <select
                      value={formData.method || 'POST'}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="select"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      {t(locale, 'tee.headers')}
                    </label>
                    <textarea
                      value={JSON.stringify(formData.headers || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const headers = JSON.parse(e.target.value);
                          setFormData({ ...formData, headers });
                        } catch {}
                      }}
                      className="input font-mono text-sm"
                      rows={4}
                      placeholder={t(locale, 'tee.headersPlaceholder')}
                    />
                  </div>
                </>
              )}
              {formData.type === 'file' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.filePath')}</label>
                  <input
                    type="text"
                    value={formData.filePath || ''}
                    onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                    className="input"
                    placeholder={t(locale, 'tee.filePathPlaceholder')}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.retries')}</label>
                  <input
                    type="number"
                    value={formData.retries || 0}
                    onChange={(e) => setFormData({ ...formData, retries: parseInt(e.target.value) })}
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'tee.timeout')}</label>
                  <input
                    type="number"
                    value={formData.timeout || 0}
                    onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                    className="input"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                  {t(locale, 'common.cancel')}
                </button>
                <button onClick={handleSave} className="btn btn-primary">
                  {editingDestination ? t(locale, 'routing.update') : t(locale, 'common.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
