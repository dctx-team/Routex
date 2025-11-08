import React, { useState, useEffect } from 'react';
import type { RoutingRule } from '../types';
import { t, type Locale } from '../i18n';

interface RoutingRulesProps {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

export function RoutingRules({ apiBase, showToast, locale = 'en' }: RoutingRulesProps) {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [formData, setFormData] = useState<Partial<RoutingRule>>({
    name: '',
    priority: 0,
    enabled: true,
    conditions: {},
    actions: {},
    description: '',
  });

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/routing/rules`);
      if (!response.ok) throw new Error('Failed to load routing rules');
      const data = await response.json();
      setRules(data.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      priority: 0,
      enabled: true,
      conditions: {},
      actions: {},
      description: '',
    });
    setShowModal(true);
  };

  const handleEdit = (rule: RoutingRule) => {
    setEditingRule(rule);
    setFormData(rule);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const isEdit = !!editingRule;
      const url = isEdit
        ? `${apiBase}/routing/rules/${editingRule.id}`
        : `${apiBase}/routing/rules`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save rule');
      showToast(isEdit ? t(locale, 'routing.ruleUpdated') : t(locale, 'routing.ruleCreated'), 'success');
      setShowModal(false);
      await loadRules();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t(locale, 'routing.confirmDelete'))) return;
    try {
      const response = await fetch(`${apiBase}/routing/rules/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete rule');
      showToast(t(locale, 'routing.ruleDeleted'), 'success');
      await loadRules();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const handleToggle = async (rule: RoutingRule) => {
    try {
      const response = await fetch(`${apiBase}/routing/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
      });
      if (!response.ok) throw new Error('Failed to toggle rule');
      showToast(!rule.enabled ? t(locale, 'routing.ruleEnabled') : t(locale, 'routing.ruleDisabled'), 'success');
      await loadRules();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to toggle', 'error');
    }
  };

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="spinner mx-auto"></div>
        <p className="mt-4 text-gray-600">{t(locale, 'routing.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t(locale, 'routing.title')}</h2>
          <button onClick={handleCreate} className="btn btn-primary">
            {t(locale, 'routing.createRule')}
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t(locale, 'routing.noRules')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t(locale, 'routing.priority')}</th>
                  <th>{t(locale, 'routing.name')}</th>
                  <th>{t(locale, 'routing.status')}</th>
                  <th>{t(locale, 'routing.conditions')}</th>
                  <th>{t(locale, 'routing.actions')}</th>
                  <th>{t(locale, 'routing.operations')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <span className="badge badge-info">{rule.priority}</span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-800">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-gray-500 mt-1">{rule.description}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${rule.enabled ? 'badge-success' : 'badge-error'}`}>
                        {rule.enabled ? t(locale, 'routing.enabled') : t(locale, 'routing.disabled')}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm space-y-1">
                        {rule.conditions.models && (
                          <div>{t(locale, 'routing.modelsLabel')}: {rule.conditions.models.join(', ')}</div>
                        )}
                        {rule.conditions.path && <div>{t(locale, 'routing.pathLabel')}: {rule.conditions.path}</div>}
                        {rule.conditions.userIds && (
                          <div>{t(locale, 'routing.usersLabel')}: {rule.conditions.userIds.join(', ')}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {rule.actions?.channelId && <div>{t(locale, 'routing.channelLabel')}: {rule.actions.channelId}</div>}
                        {rule.actions?.transformer && (
                          <div>{t(locale, 'routing.transformerLabel')}: {rule.actions.transformer}</div>
                        )}
                        {rule.action?.type && <div>{t(locale, 'routing.typeLabel')}: {rule.action.type}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggle(rule)}
                          className={`btn text-sm ${rule.enabled ? 'btn-secondary' : 'btn-success'}`}
                        >
                          {rule.enabled ? t(locale, 'routing.disable') : t(locale, 'routing.enable')}
                        </button>
                        <button onClick={() => handleEdit(rule)} className="btn btn-primary text-sm">
                          {t(locale, 'common.edit')}
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="btn btn-danger text-sm">
                          {t(locale, 'common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingRule ? t(locale, 'routing.editRule') : t(locale, 'routing.createRule')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.name')}</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder={t(locale, 'routing.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.description')}</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder={t(locale, 'routing.descriptionPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.priority')}</label>
                  <input
                    type="number"
                    value={formData.priority || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.status')}</label>
                  <select
                    value={formData.enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.value === 'enabled' })}
                    className="select"
                  >
                    <option value="enabled">{t(locale, 'routing.enabled')}</option>
                    <option value="disabled">{t(locale, 'routing.disabled')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  {t(locale, 'routing.models')}
                </label>
                <input
                  type="text"
                  value={formData.conditions?.models?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        models: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  className="input"
                  placeholder={t(locale, 'routing.modelsPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">{t(locale, 'routing.pathPattern')}</label>
                <input
                  type="text"
                  value={formData.conditions?.path || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, path: e.target.value },
                    })
                  }
                  className="input"
                  placeholder={t(locale, 'routing.pathPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  {t(locale, 'routing.targetChannel')}
                </label>
                <input
                  type="text"
                  value={formData.actions?.channelId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actions: { ...formData.actions, channelId: e.target.value },
                    })
                  }
                  className="input"
                  placeholder={t(locale, 'routing.channelPlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                  {t(locale, 'common.cancel')}
                </button>
                <button onClick={handleSave} className="btn btn-primary">
                  {editingRule ? t(locale, 'routing.update') : t(locale, 'common.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
