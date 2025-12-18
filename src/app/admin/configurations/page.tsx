'use client'

import { useEffect, useState } from 'react'
import AdminDashboardLayout from '../components/AdminDashboardLayout'

interface AppConfiguration {
  id: string
  category: string
  config_key: string
  config_data: Record<string, any>
  username?: string
  password?: string
  api_key?: string
  has_password?: boolean
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ZumRailsConfigData {
  apiBaseUrl?: string
  customerId?: string
  walletId?: string
  fundingSourceId?: string
}

export default function ConfigurationsPage() {
  const [configurations, setConfigurations] = useState<AppConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showZumRailsForm, setShowZumRailsForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const [zumRailsForm, setZumRailsForm] = useState({
    apiBaseUrl: '',
    customerId: '',
    walletId: '',
    fundingSourceId: '',
    username: '',
    password: '',
    apiKey: '',
    description: 'ZumRails payment provider configuration'
  })

  const fetchConfigurations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/configurations')
      
      if (!response.ok) {
        throw new Error('Failed to fetch configurations')
      }
      
      const result = await response.json()
      setConfigurations(result.data || [])
      setError(null)

      // Load ZumRails config if it exists
      const zumRailsConfig = result.data?.find(
        (c: AppConfiguration) => c.category === 'payment_provider' && c.config_key === 'zumrails'
      )
      
      if (zumRailsConfig) {
        setZumRailsForm({
          apiBaseUrl: zumRailsConfig.config_data?.apiBaseUrl || '',
          customerId: zumRailsConfig.config_data?.customerId || '',
          walletId: zumRailsConfig.config_data?.walletId || '',
          fundingSourceId: zumRailsConfig.config_data?.fundingSourceId || '',
          username: zumRailsConfig.username || '',
          password: '', // Don't populate password
          apiKey: zumRailsConfig.api_key || '',
          description: zumRailsConfig.description || ''
        })
        setShowZumRailsForm(true)
      }
    } catch (err) {
      console.error('Error fetching configurations:', err)
      setError('Failed to load configurations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigurations()
  }, [])

  const handleTestConfig = async () => {
    setTestLoading(true)
    setTestError(null)
    setTestResult(null)

    try {
      const response = await fetch('/api/admin/configurations/test')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test configuration')
      }

      setTestResult(data)
    } catch (err: any) {
      console.error('Error testing configuration:', err)
      setTestError(err.message || 'Failed to test configuration')
    } finally {
      setTestLoading(false)
    }
  }

  const handleZumRailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setFormLoading(true)

    try {
      // Check if ZumRails config exists
      const existingConfig = configurations.find(
        (c) => c.category === 'payment_provider' && c.config_key === 'zumrails'
      )

      const configData: ZumRailsConfigData = {
        apiBaseUrl: zumRailsForm.apiBaseUrl || undefined,
        customerId: zumRailsForm.customerId || undefined,
        walletId: zumRailsForm.walletId || undefined,
        fundingSourceId: zumRailsForm.fundingSourceId || undefined
      }

      // Remove undefined values
      Object.keys(configData).forEach(key => {
        if (configData[key as keyof ZumRailsConfigData] === undefined) {
          delete configData[key as keyof ZumRailsConfigData]
        }
      })

      const requestBody: any = {
        category: 'payment_provider',
        config_key: 'zumrails',
        config_data: configData,
        description: zumRailsForm.description
      }

      // Only include sensitive fields if they're provided
      if (zumRailsForm.username) {
        requestBody.username = zumRailsForm.username
      }
      if (zumRailsForm.password) {
        requestBody.password = zumRailsForm.password
      }
      if (zumRailsForm.apiKey) {
        requestBody.api_key = zumRailsForm.apiKey
      }

      const url = '/api/admin/configurations'
      const method = existingConfig ? 'PUT' : 'POST'
      
      if (existingConfig) {
        requestBody.id = existingConfig.id
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration')
      }

      setFormSuccess('Configuration saved successfully!')
      await fetchConfigurations()
      
      // Clear password field after successful save
      setZumRailsForm(prev => ({ ...prev, password: '' }))
    } catch (err: any) {
      console.error('Error saving configuration:', err)
      setFormError(err.message || 'Failed to save configuration')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading configurations...</div>
        </div>
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">App Configurations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage application-wide settings and payment provider configurations
            </p>
          </div>
          <button
            onClick={() => setShowZumRailsForm(!showZumRailsForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showZumRailsForm ? 'Hide' : 'Configure'} ZumRails
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {showZumRailsForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ZumRails Configuration
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Configure ZumRails payment provider settings. Sensitive fields (username, password, API key) are encrypted in the database.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {formSuccess}
              </div>
            )}

            {/* Test Config Button */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <button
                type="button"
                onClick={handleTestConfig}
                disabled={testLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Check Config
                  </>
                )}
              </button>

              {testError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <strong>Error:</strong> {testError}
                </div>
              )}

              {testResult && (
                <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Configuration Test Result</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      testResult.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {testResult.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  
                  {testResult.success && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Source:</span>{' '}
                        <span className="text-gray-600 capitalize">
                          {testResult.source?.replace('_', ' ') || 'unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Timestamp:</span>{' '}
                        <span className="text-gray-600">
                          {new Date(testResult.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="font-medium text-gray-700 mb-2">Configuration Values:</div>
                        <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto">
                          {JSON.stringify(testResult.config, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleZumRailsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Base URL
                  </label>
                  <input
                    type="url"
                    value={zumRailsForm.apiBaseUrl}
                    onChange={(e) =>
                      setZumRailsForm({ ...zumRailsForm, apiBaseUrl: e.target.value })
                    }
                    placeholder="https://api-sandbox.zumrails.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={zumRailsForm.customerId}
                    onChange={(e) =>
                      setZumRailsForm({ ...zumRailsForm, customerId: e.target.value })
                    }
                    placeholder="Customer ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wallet ID
                  </label>
                  <input
                    type="text"
                    value={zumRailsForm.walletId}
                    onChange={(e) =>
                      setZumRailsForm({ ...zumRailsForm, walletId: e.target.value })
                    }
                    placeholder="Wallet ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Funding Source ID
                  </label>
                  <input
                    type="text"
                    value={zumRailsForm.fundingSourceId}
                    onChange={(e) =>
                      setZumRailsForm({ ...zumRailsForm, fundingSourceId: e.target.value })
                    }
                    placeholder="Funding Source ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={zumRailsForm.username}
                    onChange={(e) =>
                      setZumRailsForm({ ...zumRailsForm, username: e.target.value })
                    }
                    placeholder="ZumRails username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to keep current value
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={zumRailsForm.password}
                    onChange={(e) =>
                      setZumRailsForm({ ...zumRailsForm, password: e.target.value })
                    }
                    placeholder="ZumRails password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to keep current value
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={zumRailsForm.apiKey}
                    onChange={(e) =>
                      setZumRailsForm({ ...zumRailsForm, apiKey: e.target.value })
                    }
                    placeholder="API Key (if different from username/password)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to keep current value
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowZumRailsForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of existing configurations */}
        {configurations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Existing Configurations</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {configurations.map((config) => (
                <div key={config.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {config.category} / {config.config_key}
                        </span>
                        {config.is_active ? (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {config.description && (
                        <p className="mt-1 text-sm text-gray-500">{config.description}</p>
                      )}
                      <div className="mt-2 text-xs text-gray-400">
                        Updated: {new Date(config.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  )
}

