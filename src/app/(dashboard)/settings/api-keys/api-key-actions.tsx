'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Copy, Loader2, X, Check } from 'lucide-react';

const AVAILABLE_SCOPES = [
  { value: 'cases:read', label: 'Read Cases' },
  { value: 'cases:write', label: 'Write Cases' },
  { value: 'recordings:read', label: 'Read Recordings' },
  { value: 'recordings:write', label: 'Write Recordings' },
  { value: 'forms:read', label: 'Read Forms' },
  { value: 'forms:write', label: 'Write Forms' },
  { value: 'analysis:write', label: 'AI Analysis' },
];

interface CreateApiKeyButtonProps {
  organizationId: string;
}

export function CreateApiKeyButton({ organizationId }: CreateApiKeyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || scopes.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const data = await response.json();
      setNewKey(data.key);
      router.refresh();
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setName('');
    setScopes([]);
    setNewKey(null);
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
      >
        <Plus className="w-5 h-5" />
        Create API Key
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6">
            {newKey ? (
              <>
                <h2 className="text-lg font-semibold mb-4">API Key Created</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    Make sure to copy your API key now. You won&apos;t be able to see it again!
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <code className="flex-1 text-sm bg-slate-100 px-3 py-2 rounded font-mono overflow-x-auto">
                    {newKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-slate-100 rounded"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Create API Key</h2>
                  <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Production API"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Scopes <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <label
                          key={scope.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={scopes.includes(scope.value)}
                            onChange={() => toggleScope(scope.value)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">{scope.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={loading || !name.trim() || scopes.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Key
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface ApiKeyActionsProps {
  apiKeyId: string;
}

export function ApiKeyActions({ apiKeyId }: ApiKeyActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/api-keys/${apiKeyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting API key:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
    >
      {deleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  );
}
