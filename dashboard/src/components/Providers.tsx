import React, { useState, useEffect } from 'react';
import type { Provider } from '../types';
import { t, type Locale } from '../i18n';

interface ProvidersProps {
  apiBase: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  locale?: Locale;
}

export function Providers({ apiBase, showToast, locale = 'en' }: ProvidersProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/providers`);
      if (!response.ok) throw new Error(t(locale, 'providers.failedLoad'));
      const data = await response.json();
      setProviders(data.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t(locale, 'providers.failedLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const getProviderIcon = (type: string) => {
    const icons: Record<string, string> = {
      anthropic: '🤖',
      openai: '🧠',
      google: '🔍',
      custom: '⚙️',
    };
    return icons[type] || '🔌';
  };

  const getProviderColor = (type: string) => {
    const colors: Record<string, string> = {
      anthropic: 'border-orange-500 bg-orange-50',
      openai: 'border-green-500 bg-green-50',
      google: 'border-blue-500 bg-blue-50',
      custom: 'border-purple-500 bg-purple-50',
    };
    return colors[type] || 'border-gray-500 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="spinner mx-auto"></div>
        <p className="mt-4 text-gray-600">{t(locale, 'providers.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{t(locale, 'providers.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t(locale, 'providers.subtitle')}
            </p>
          </div>
        </div>

        {providers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t(locale, 'providers.noProviders')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.type}
                className={`p-4 rounded-lg border-l-4 ${getProviderColor(provider.type)} cursor-pointer hover:shadow-md transition`}
                onClick={() => setSelectedProvider(provider)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getProviderIcon(provider.type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{provider.type}</p>
                    </div>
                  </div>
                  <span className="badge badge-info">{provider.supportedModels?.length || 0} {t(locale, 'providers.models')}</span>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">{t(locale, 'providers.baseUrl')}:</span>
                    <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                      {provider.defaultBaseUrl}
                    </code>
                  </div>

                  {provider.features && provider.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.features.slice(0, 3).map((feature) => (
                        <span key={feature} className="badge badge-success text-xs">
                          {feature}
                        </span>
                      ))}
                      {provider.features.length > 3 && (
                        <span className="badge badge-info text-xs">
                          +{provider.features.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    {t(locale, 'providers.clickToView')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getProviderIcon(selectedProvider.type)}</span>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{selectedProvider.name}</h3>
                  <p className="text-sm text-gray-600">{selectedProvider.type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="btn btn-secondary"
              >
                {t(locale, 'common.cancel')}
              </button>
            </div>

            <div className="space-y-6">
              <div className="card bg-gray-50">
                <h4 className="font-semibold text-gray-800 mb-2">{t(locale, 'providers.configuration')}</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">{t(locale, 'providers.defaultBaseUrl')}:</span>
                    <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                      {selectedProvider.defaultBaseUrl}
                    </code>
                  </div>
                </div>
              </div>

              {selectedProvider.features && selectedProvider.features.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">{t(locale, 'providers.features')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider.features.map((feature) => (
                      <span key={feature} className="badge badge-success">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">
                  {t(locale, 'providers.supportedModels')} ({selectedProvider.supportedModels.length})
                </h4>
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedProvider.supportedModels.map((model) => (
                      <div
                        key={model}
                        className="p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition"
                      >
                        <code className="text-sm text-gray-800">{model}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card bg-blue-50">
                <h4 className="font-semibold text-gray-800 mb-2">{t(locale, 'providers.usageExample')}</h4>
                <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
{`{
  "name": "my-${selectedProvider.type}-channel",
  "type": "${selectedProvider.type}",
  "baseURL": "${selectedProvider.defaultBaseUrl}",
  "apiKey": "your-api-key-here",
  "models": ["${selectedProvider.supportedModels[0] || 'model-name'}"],
  "priority": 1,
  "weight": 1,
  "status": "enabled"
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
