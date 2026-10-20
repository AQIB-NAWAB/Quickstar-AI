"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type LeadSchemaField = {
  key: string;
  label: string;
  role: "identity" | "contact_email" | "contact_phone" | "custom";
  required: boolean;
};

const ROLES: LeadSchemaField["role"][] = [
  "identity",
  "contact_email",
  "contact_phone",
  "custom",
];

export function LeadSchemaEditor({ workspaceId }: { workspaceId: string }) {
  const [fields, setFields] = useState<LeadSchemaField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/leads/schema`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        lead_schema?: LeadSchemaField[];
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to load schema");
        setLoading(false);
        return;
      }
      setFields(
        (body.lead_schema ?? []).map((f) => ({
          key: f.key,
          label: f.label,
          role: f.role,
          required: Boolean(f.required),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema");
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField(index: number, patch: Partial<LeadSchemaField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { key: `custom_${prev.length + 1}`, label: "Custom field", role: "custom", required: false },
    ]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/leads/schema`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_schema: fields }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        lead_schema?: LeadSchemaField[];
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to save schema");
        setSaving(false);
        return;
      }
      setFields(body.lead_schema ?? fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schema");
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading lead schema…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/workspaces/${workspaceId}/leads`}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Leads
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Lead schema</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define captured field keys and roles. Custom fields land in JSON attributes — no ALTER
            TABLE.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSave} className="space-y-4">
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <li
              key={`${field.key}-${index}`}
              className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_140px_80px_auto]"
            >
              <label className="text-xs">
                Key
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={field.key}
                  onChange={(e) => updateField(index, { key: e.target.value })}
                  required
                />
              </label>
              <label className="text-xs">
                Label
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  required
                />
              </label>
              <label className="text-xs">
                Role
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={field.role}
                  onChange={(e) =>
                    updateField(index, { role: e.target.value as LeadSchemaField["role"] })
                  }
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-xs">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => removeField(index)}
                className="self-end rounded-md border border-border px-2 py-1.5 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={addField}
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          >
            Add field
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save schema"}
          </button>
        </div>
      </form>
    </div>
  );
}
