import { requireOrg, getCurrentOrganization, hasRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  AlertCircle,
  Clock,
  Shield,
} from 'lucide-react';
import { ApiKeyActions, CreateApiKeyButton } from './api-key-actions';

export default async function ApiKeysPage() {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  // Check admin access
  if (!hasRole(authUser.role, 'ADMIN')) {
    redirect('/dashboard');
  }

  const apiKeys = await db.apiKey.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for external integrations
          </p>
        </div>
        <CreateApiKeyButton organizationId={organization.id} />
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-800">Keep your API keys secure</p>
          <p className="text-sm text-yellow-700">
            Never share your API keys in publicly accessible areas such as GitHub, client-side code, or forums.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">No API keys</h2>
          <p className="text-muted-foreground mb-4">
            Create an API key to start using the REST API
          </p>
          <CreateApiKeyButton organizationId={organization.id} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Key
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Scopes
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Last Used
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Created
                </th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {apiKeys.map((apiKey) => {
                const scopes = (apiKey.scopes as string[]) || [];
                return (
                  <tr key={apiKey.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm">{apiKey.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                          {apiKey.keyHash.substring(0, 12)}...
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {scopes.slice(0, 3).map((scope) => (
                          <span
                            key={scope}
                            className="text-xs bg-slate-100 px-2 py-0.5 rounded"
                          >
                            {scope}
                          </span>
                        ))}
                        {scopes.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{scopes.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {apiKey.lastUsedAt
                          ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(apiKey.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ApiKeyActions apiKeyId={apiKey.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* API Documentation Link */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          API Documentation
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Learn how to use the API to integrate with your existing tools and workflows.
        </p>
        <div className="flex items-center gap-4">
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            View OpenAPI Spec
          </a>
          <span className="text-muted-foreground">|</span>
          <a
            href="https://swagger.io/tools/swagger-ui/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Swagger UI
          </a>
        </div>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium mb-2">Authentication</p>
          <p className="text-sm text-muted-foreground mb-2">
            Include your API key in the request header:
          </p>
          <code className="text-sm bg-slate-200 px-3 py-1.5 rounded block font-mono">
            x-api-key: ip_your_api_key_here
          </code>
        </div>
      </div>
    </div>
  );
}
