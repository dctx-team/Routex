import React, { useState, useEffect } from 'react';
import type { Transformer } from '../types';
import { t, type Locale } from '../i18n';

interface TransformersManagerProps {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

export function TransformersManager({ apiBase, showToast, locale = 'en' }: TransformersManagerProps) {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransformer, setEditingTransformer] = useState<Transformer | null>(null);
  const [configJson, setConfigJson] = useState('{}');

  const loadTransformers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/transformers`);
      if (!response.ok) throw new Error('Failed to load transformers');
      const data = await response.json();
      setTransformers(data.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load transformers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransformers();
  }, []);

  const handleEdit = (transformer: Transformer) => {
    setEditingTransformer(transformer);
    setConfigJson(JSON.stringify(transformer.config || {}, null, 2));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingTransformer) return;
    try {
      let config;
      try {
        config = JSON.parse(configJson);
      } catch {
        throw new Error(t(locale, 'transformers.invalidJson'));
      }

      const response = await fetch(`${apiBase}/transformers/${editingTransformer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingTransformer,
          config,
        }),
      });

      if (!response.ok) throw new Error('Failed to update transformer');
      showToast(t(locale, 'transformers.updated'), 'success');
      setShowModal(false);
      await loadTransformers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };

  const handleToggle = async (transformer: Transformer) => {
    try {
      const response = await fetch(`${apiBase}/transformers/${transformer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transformer, enabled: !transformer.enabled }),
      });
      if (!response.ok) throw new Error('Failed to toggle transformer');
      const action = !transformer.enabled ? t(locale, 'routing.enabled').toLowerCase() : t(locale, 'routing.disabled').toLowerCase();
      showToast(t(locale, 'transformers.toggled').replace('{0}', action), 'success');
      await loadTransformers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to toggle', 'error');
    }
  };

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="spinner mx-auto"></div>
        <p className="mt-4 text-gray-600">{t(locale, 'transformers.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t(locale, 'transformers.title')}</h2>
        </div>

        {transformers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t(locale, 'transformers.noTransformers')}</p>
        ) : (
          <div className="space-y-4">
            {transformers.map((transformer) => (
              <div
                key={transformer.id}
                className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                  transformer.enabled
                    ? 'bg-green-50 border-green-500'
                    : 'bg-gray-50 border-gray-400 opacity-60'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">{transformer.name}</h3>
                    <span className="badge badge-info">{transformer.type}</span>
                    <span className="badge badge-info">{t(locale, 'routing.priority')}: {transformer.priority}</span>
                  </div>
                  {transformer.description && (
                    <p className="text-sm text-gray-600 mb-2">{transformer.description}</p>
                  )}
                  <div className="text-sm text-gray-600">
                    <span className={transformer.enabled ? 'text-green-600 font-medium' : 'text-gray-500'}>
                      {transformer.enabled ? t(locale, 'routing.enabled') : t(locale, 'routing.disabled')}
                    </span>
                    {transformer.config && Object.keys(transformer.config).length > 0 && (
                      <span className="ml-3">
                        {t(locale, 'transformers.config')}: {Object.keys(transformer.config).length} {t(locale, 'transformers.parameters')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(transformer)}
                    className={`btn text-sm ${transformer.enabled ? 'btn-secondary' : 'btn-success'}`}
                  >
                    {transformer.enabled ? t(locale, 'routing.disable') : t(locale, 'routing.enable')}
                  </button>
                  <button onClick={() => handleEdit(transformer)} className="btn btn-primary text-sm">
                    {t(locale, 'transformers.configure')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && editingTransformer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {t(locale, 'transformers.configureTitle').replace('{0}', editingTransformer.name)}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'channels.type')}</label>
                <input
                  type="text"
                  value={editingTransformer.type}
                  className="input bg-gray-100"
                  readOnly
                />
              </div>
              {editingTransformer.description && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.description')}</label>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                    {editingTransformer.description}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.priority')}</label>
                <input
                  type="number"
                  value={editingTransformer.priority}
                  onChange={(e) =>
                    setEditingTransformer({
                      ...editingTransformer,
                      priority: parseInt(e.target.value),
                    })
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.status')}</label>
                <select
                  value={editingTransformer.enabled ? 'enabled' : 'disabled'}
                  onChange={(e) =>
                    setEditingTransformer({
                      ...editingTransformer,
                      enabled: e.target.value === 'enabled',
                    })
                  }
                  className="select"
                >
                  <option value="enabled">{t(locale, 'routing.enabled')}</option>
                  <option value="disabled">{t(locale, 'routing.disabled')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  {t(locale, 'transformers.configJson')}
                </label>
                <textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  className="input font-mono text-sm"
                  rows={10}
                  placeholder="{}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t(locale, 'transformers.configPlaceholder')}
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                  {t(locale, 'common.cancel')}
                </button>
                <button onClick={handleSave} className="btn btn-primary">
                  {t(locale, 'transformers.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
