"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderPlus,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  createCollection,
  createConnector,
  deleteCollection,
  listCollections,
  listConnectors,
  listWorkspaceBatches,
  revokeConnector,
  rotateConnectorToken,
  suggestFieldMapping,
  testFieldMapping,
} from "../lib/client";
import type {
  InboundBatchEvent,
  InboundConnector,
  LeadCollection,
  QualificationMode,
} from "../lib/types";

interface ConnectorsPageProps {
  workspaceId: string;
}

export function LeadGenerationConnectorsPage({ workspaceId }: ConnectorsPageProps) {
  const [activeTab, setActiveTab] = useState<"connectors" | "collections" | "batches" | "guide">("connectors");
  const [connectors, setConnectors] = useState<InboundConnector[]>([]);
  const [collections, setCollections] = useState<LeadCollection[]>([]);
  const [batches, setBatches] = useState<InboundBatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Connector Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newConnName, setNewConnName] = useState("");
  const [newConnSourceType, setNewConnSourceType] = useState("generic_json");
  const [newConnCollectionId, setNewConnCollectionId] = useState("");
  const [newConnMode, setNewConnMode] = useState<QualificationMode>("strict");
  const [newConnBatchLimit, setNewConnBatchLimit] = useState(100);
  const [submittingConn, setSubmittingConn] = useState(false);

  // Revealed Token Modal
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [revealedConnectorId, setRevealedConnectorId] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // New Collection Modal state
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [newCollDesc, setNewCollDesc] = useState("");
  const [newCollMode, setNewCollMode] = useState<QualificationMode>("strict");
  const [newCollContact, setNewCollContact] = useState<"none" | "email" | "phone" | "either" | "both">("none");
  const [submittingColl, setSubmittingColl] = useState(false);

  // Field Mapping Test Bench state
  const [testSample, setTestSample] = useState(
    JSON.stringify(
      {
        company: "Apex Luxury Jewels",
        website: "https://apexluxury.example.com",
        contact_name: "Elena Rostova",
        title: "Head of Procurement",
        email: "elena@apexluxury.example.com",
        phone: "+1-415-555-0199",
        industry: "Luxury Retail & Jewelry",
        city: "San Francisco, CA",
        employees: "50-100",
      },
      null,
      2,
    ),
  );
  const [mappingEntries, setMappingEntries] = useState<Array<{ source: string; target: string }>>([
    { source: "company", target: "company_name" },
    { source: "contact_name", target: "person_name" },
    { source: "title", target: "person_role" },
  ]);
  const [testResult, setTestResult] = useState<{ transformed: Record<string, unknown>; missing_fields: string[] } | null>(null);
  const [testingMapping, setTestingMapping] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, collRes, bRes] = await Promise.all([
        listConnectors(workspaceId),
        listCollections(workspaceId),
        listWorkspaceBatches(workspaceId),
      ]);
      if (cRes.data) setConnectors(cRes.data.items);
      if (collRes.data) setCollections(collRes.data.items);
      if (bRes.data) setBatches(bRes.data.items);
      if (cRes.error) setError(cRes.error.message);
    } catch (e: any) {
      setError(e?.message || "Failed to load connectors");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateConnector(e: React.FormEvent) {
    e.preventDefault();
    if (!newConnName.trim()) return;
    setSubmittingConn(true);
    setError(null);

    const mappingObj: Record<string, string> = {};
    for (const m of mappingEntries) {
      if (m.source.trim() && m.target.trim()) {
        mappingObj[m.source.trim()] = m.target.trim();
      }
    }

    const res = await createConnector(workspaceId, {
      name: newConnName.trim(),
      source_type: newConnSourceType,
      collection_id: newConnCollectionId || undefined,
      default_qualification_mode: newConnMode,
      batch_size_limit: newConnBatchLimit,
      field_mapping: Object.keys(mappingObj).length > 0 ? mappingObj : undefined,
    });

    setSubmittingConn(false);
    if (res.data) {
      setRevealedToken(res.data.secret_token);
      setRevealedConnectorId(res.data.connector.id);
      setCreateModalOpen(false);
      setNewConnName("");
      void loadData();
    } else {
      setError(res.error?.message || "Failed to create connector");
    }
  }

  async function handleRotateToken(connectorId: string) {
    if (!confirm("Rotating the token will invalidate the old credential immediately. Continue?")) return;
    const res = await rotateConnectorToken(workspaceId, connectorId);
    if (res.data) {
      setRevealedToken(res.data.secret_token);
      setRevealedConnectorId(res.data.connector.id);
      void loadData();
    } else {
      alert(res.error?.message || "Failed to rotate token");
    }
  }

  async function handleRevokeConnector(connectorId: string) {
    if (!confirm("Are you sure you want to revoke this connector? All incoming push requests will be rejected.")) return;
    const res = await revokeConnector(workspaceId, connectorId);
    if (res.data) {
      void loadData();
    } else {
      alert(res.error?.message || "Failed to revoke connector");
    }
  }

  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newCollName.trim()) return;
    setSubmittingColl(true);
    const res = await createCollection(workspaceId, {
      name: newCollName.trim(),
      description: newCollDesc.trim() || undefined,
      qualification_overrides: {
        qualification_mode: newCollMode,
        required_contact: newCollContact,
      },
    });
    setSubmittingColl(false);
    if (res.data) {
      setCollectionModalOpen(false);
      setNewCollName("");
      setNewCollDesc("");
      void loadData();
    } else {
      alert(res.error?.message || "Failed to create collection");
    }
  }

  async function handleDeleteCollection(collectionId: string) {
    if (!confirm("Are you sure you want to delete this collection?")) return;
    const res = await deleteCollection(workspaceId, collectionId);
    if (res.data) {
      void loadData();
    } else {
      alert(res.error?.message || "Failed to delete collection");
    }
  }

  async function handleSuggestMapping() {
    try {
      const parsed = JSON.parse(testSample);
      const res = await suggestFieldMapping(workspaceId, { sample_payload: parsed });
      if (res.data?.suggested_mapping) {
        const entries = Object.entries(res.data.suggested_mapping).map(([source, target]) => ({
          source,
          target,
        }));
        setMappingEntries(entries);
      }
    } catch {
      alert("Please ensure the sample payload is valid JSON first.");
    }
  }

  async function handleTestMapping() {
    setTestingMapping(true);
    try {
      const parsed = JSON.parse(testSample);
      const mappingObj: Record<string, string> = {};
      for (const m of mappingEntries) {
        if (m.source.trim() && m.target.trim()) {
          mappingObj[m.source.trim()] = m.target.trim();
        }
      }
      const res = await testFieldMapping(workspaceId, {
        sample_payload: parsed,
        mapping: mappingObj,
      });
      if (res.data) {
        setTestResult(res.data);
      } else {
        alert(res.error?.message || "Test failed");
      }
    } catch (err: any) {
      alert("Invalid sample JSON: " + err.message);
    } finally {
      setTestingMapping(false);
    }
  }

  function copyToken(text: string) {
    navigator.clipboard.writeText(text);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://app.quickstartai.com";

  return (
    <div className="lead-console space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Link
              href={`/workspaces/${workspaceId}/lead-generation/runs`}
              className="hover:text-neutral-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Lead generation</span>
            </Link>
            <span>/</span>
            <span className="text-neutral-800">Inbound Connectors</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5">
            <Webhook className="w-6 h-6 text-heat-100" />
            <span>Inbound Connectors & Collections</span>
          </h1>
          <p className="text-xs text-neutral-600 max-w-2xl">
            Configure external scrapers, crawlers, Apify Actors, or webhook automations to push lead data directly into your workspace. Inbound leads are validated, normalized, deduplicated, and qualified.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setCollectionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-8 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-neutral-600" />
            <span>New collection</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-8 text-xs font-semibold bg-heat-100 hover:bg-orange-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create connector</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-8 border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("connectors")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "connectors"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Webhook className="w-4 h-4" />
            <span>Connectors ({connectors.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "collections"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Collections ({collections.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batches")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "batches"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Ingestion History ({batches.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-2 ${
              activeTab === "guide"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Apify & Integration Guide</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: CONNECTORS */}
      {activeTab === "connectors" && (
        <div className="space-y-4">
          {connectors.length === 0 && !loading ? (
            <div className="rounded-12 border border-dashed border-neutral-300 p-12 text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <Webhook className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">No inbound connectors yet</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Generate a webhook URL and scoped ingestion token to push leads from scrapers, external crawlers, or Apify datasets.
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-8 text-xs font-semibold bg-heat-100 text-white hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create first connector</span>
              </button>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-10 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Connector Name</th>
                    <th className="py-3 px-4">Ingestion URL</th>
                    <th className="py-3 px-4">Default Mode</th>
                    <th className="py-3 px-4">Target Collection</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Ingestion</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {connectors.map((c) => {
                    const coll = collections.find((col) => col.id === c.collection_id);
                    const ingestUrl = `${originUrl}/api/v1/inbound/ingest/${c.id}`;
                    return (
                      <tr key={c.id} className="hover:bg-neutral-50/70">
                        <td className="py-3.5 px-4 font-semibold text-neutral-900">
                          <div className="flex items-center gap-2">
                            <span>{c.name}</span>
                            <span className="text-[10px] font-normal uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                              {c.source_type || "generic"}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-neutral-400">ID: {c.id}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-neutral-600 max-w-[200px] truncate" title={ingestUrl}>
                              {ingestUrl}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToken(ingestUrl)}
                              className="text-neutral-400 hover:text-neutral-700"
                              title="Copy URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 capitalize">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                            c.default_qualification_mode === "strict"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}>
                            {c.default_qualification_mode || "strict"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600">
                          {coll ? (
                            <span className="font-medium text-neutral-800">{coll.name}</span>
                          ) : (
                            <span className="text-neutral-400">Default workspace</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {c.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-neutral-500 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                              <span>Revoked</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500">
                          {c.last_used_at ? new Date(c.last_used_at).toLocaleString() : "Never"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleRotateToken(c.id)}
                              className="px-2 py-1 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded text-[11px] font-medium hover:bg-neutral-100"
                              title="Rotate ingestion token"
                            >
                              Rotate Token
                            </button>
                            {c.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleRevokeConnector(c.id)}
                                className="px-2 py-1 text-red-600 hover:text-red-700 border border-red-200 rounded text-[11px] font-medium hover:bg-red-50"
                                title="Revoke connector"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COLLECTIONS */}
      {activeTab === "collections" && (
        <div className="space-y-4">
          {collections.length === 0 && !loading ? (
            <div className="rounded-12 border border-dashed border-neutral-300 p-12 text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">No collections defined</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Collections group related inbound batches and can enforce specific qualification mode and contact requirement overrides.
              </p>
              <button
                type="button"
                onClick={() => setCollectionModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-8 text-xs font-semibold bg-heat-100 text-white hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create collection</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col) => (
                <div key={col.id} className="border border-neutral-200 rounded-10 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">{col.name}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{col.description || "No description provided."}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(col.id)}
                      className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-neutral-100 transition-colors"
                      title="Delete collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border-t border-neutral-100 pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Mode Override:</span>
                      <span className="font-semibold capitalize text-neutral-900">
                        {col.qualification_overrides?.qualification_mode || "Inherit connector"}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Required Contact:</span>
                      <span className="font-semibold capitalize text-neutral-900">
                        {col.qualification_overrides?.required_contact || "none"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[10px] font-mono text-neutral-400 border-t border-neutral-100">
                    ID: {col.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BATCHES */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          {batches.length === 0 ? (
            <div className="rounded-12 border border-dashed border-neutral-300 p-12 text-center bg-white space-y-2">
              <p className="text-xs text-neutral-500">No inbound batches received yet.</p>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-10 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Connector</th>
                    <th className="py-3 px-4">Records</th>
                    <th className="py-3 px-4">Created / Updated</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {batches.map((b) => {
                    const conn = connectors.find((c) => c.id === b.connector_id);
                    return (
                      <tr key={b.id} className="hover:bg-neutral-50/70">
                        <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                          {new Date(b.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                          {b.id.slice(0, 8)}…
                        </td>
                        <td className="py-3 px-4 font-medium text-neutral-900">
                          {conn?.name || b.connector_id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-800">
                          {b.records_count}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">
                          <span className="text-emerald-700 font-semibold">{b.created_count} created</span>
                          <span className="text-neutral-400 mx-1">/</span>
                          <span className="text-blue-700 font-semibold">{b.updated_count} updated</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            b.status === "completed"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : b.status === "partial_failure"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}>
                            {b.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-500">
                          {b.failed_count > 0 ? (
                            <span className="text-red-600 font-medium">{b.failed_count} failed</span>
                          ) : (
                            <span className="text-emerald-600">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: APIFY & INTEGRATION GUIDE */}
      {activeTab === "guide" && (
        <div className="space-y-6 bg-white border border-neutral-200 rounded-12 p-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-heat-100" />
              <span>External Inbound Lead Push Architecture</span>
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-3xl">
              External tools run independently and <strong>PUSH</strong> results into QuickStart AI via our HTTP ingestion endpoint. The portal does not initiate or control external scraper jobs.
            </p>
          </div>

          <div className="border border-neutral-200 rounded-10 p-4 bg-neutral-50 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Example cURL Ingestion</h4>
            <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-8 text-xs font-mono overflow-x-auto leading-relaxed">
{`curl -X POST "${originUrl}/api/v1/inbound/ingest/<YOUR_CONNECTOR_ID>" \\
  -H "Authorization: Bearer inb_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: batch-2026-10-25-01" \\
  -d '{
    "records": [
      {
        "company": "Apex Luxury Jewels",
        "website": "https://apexluxury.example.com",
        "contact_name": "Elena Rostova",
        "title": "Head of Procurement",
        "email": "elena@apexluxury.example.com",
        "phone": "+1-415-555-0199",
        "industry": "Luxury Retail",
        "city": "San Francisco, CA"
      }
    ]
  }'`}
            </pre>
          </div>

          <div className="space-y-3 text-xs text-neutral-700 leading-relaxed">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-bold text-neutral-900 text-sm">Apify Actor Integration Options</h4>
              <Link
                href={`/workspaces/${workspaceId}/integrations`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-6 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold text-xs transition-colors self-start sm:self-auto"
              >
                <span>Connect Apify Account via Integrations</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-neutral-200 rounded-8 p-4 bg-white space-y-2">
                <span className="font-bold text-neutral-900 block">Option A: Direct Inbound Webhook</span>
                <p className="text-neutral-600">
                  Configure an Apify Actor with a webhook that POSTs the dataset or item output directly to the Ingestion URL with the <code className="bg-neutral-100 px-1 py-0.5 rounded">Authorization: Bearer inb_live_...</code> header.
                </p>
              </div>
              <div className="border border-neutral-200 rounded-8 p-4 bg-white space-y-2">
                <span className="font-bold text-neutral-900 block">Option B: External Adapter / Zapier / Make</span>
                <p className="text-neutral-600">
                  When an Apify Actor finishes and sends a run notification webhook containing a dataset ID, use an automation step or external script to fetch the dataset and POST normalized JSON records to our endpoint.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVEALED TOKEN MODAL (SHOWN ONCE) */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-12 max-w-lg w-full p-6 space-y-4 shadow-xl border border-neutral-200">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>Inbound Ingestion Credential Generated</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-8 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Copy this secret token now.</strong> For security, raw tokens are never logged or stored in plain text (we store only a SHA-256 hash) and cannot be retrieved again.
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-700">Scoped Token</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={revealedToken}
                  className="font-mono text-xs p-2.5 bg-neutral-100 border border-neutral-300 rounded-6 flex-1 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToken(revealedToken)}
                  className="px-3 py-2.5 bg-heat-100 hover:bg-orange-600 text-white rounded-6 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  {tokenCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{tokenCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="block text-xs font-semibold text-neutral-700">Ingestion Endpoint URL</label>
              <input
                type="text"
                readOnly
                value={`${originUrl}/api/v1/inbound/ingest/${revealedConnectorId}`}
                className="font-mono text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-6 w-full select-all text-neutral-600"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setRevealedToken(null)}
                className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-8 hover:bg-neutral-800 transition-colors"
              >
                I have saved this credential safely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CONNECTOR MODAL WITH FIELD MAPPER */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-12 max-w-2xl w-full p-6 space-y-5 shadow-xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">Create Inbound Connector</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConnector} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-800">Connector Name *</label>
                  <input
                    type="text"
                    required
                    value={newConnName}
                    onChange={(e) => setNewConnName(e.target.value)}
                    placeholder="e.g. Apify Luxury Scraper"
                    className="w-full p-2.5 border border-neutral-300 rounded-6 text-xs text-neutral-900 focus:outline-none focus:border-heat-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-800">Source Type</label>
                  <select
                    value={newConnSourceType}
                    onChange={(e) => setNewConnSourceType(e.target.value)}
                    className="w-full p-2.5 border border-neutral-300 rounded-6 text-xs text-neutral-900 focus:outline-none focus:border-heat-100"
                  >
                    <option value="generic_json">Generic Inbound JSON</option>
                    <option value="apify">Apify Actor</option>
                    <option value="crawler">Custom Crawler</option>
                    <option value="webhook">External Webhook</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-800">Target Collection (Optional)</label>
                  <select
                    value={newConnCollectionId}
                    onChange={(e) => setNewConnCollectionId(e.target.value)}
                    className="w-full p-2.5 border border-neutral-300 rounded-6 text-xs text-neutral-900 focus:outline-none focus:border-heat-100"
                  >
                    <option value="">None (Workspace General)</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-800">Default Qualification Mode</label>
                  <select
                    value={newConnMode}
                    onChange={(e) => setNewConnMode(e.target.value as QualificationMode)}
                    className="w-full p-2.5 border border-neutral-300 rounded-6 text-xs text-neutral-900 focus:outline-none focus:border-heat-100"
                  >
                    <option value="strict">Strict (All mandatory facts verified)</option>
                    <option value="best_match">Best Match (Rank with visible gaps)</option>
                  </select>
                </div>
              </div>

              {/* Field Mapping Test Bench */}
              <div className="border-t border-neutral-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900">Field Mapping & Sample Tester</span>
                  <button
                    type="button"
                    onClick={handleSuggestMapping}
                    className="text-heat-100 hover:text-orange-700 font-semibold inline-flex items-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto-Suggest from Sample</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-500">Sample Inbound JSON Record</label>
                  <textarea
                    rows={4}
                    value={testSample}
                    onChange={(e) => setTestSample(e.target.value)}
                    className="w-full font-mono text-[11px] p-2 bg-neutral-50 border border-neutral-200 rounded-6"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-700">Field Mappings (Source Key → Target Field)</span>
                    <button
                      type="button"
                      onClick={() => setMappingEntries((prev) => [...prev, { source: "", target: "company_name" }])}
                      className="text-neutral-500 hover:text-neutral-900 text-[11px] font-medium"
                    >
                      + Add Rule
                    </button>
                  </div>
                  {mappingEntries.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. company_name"
                        value={m.source}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMappingEntries((prev) => prev.map((item, i) => i === idx ? { ...item, source: val } : item));
                        }}
                        className="flex-1 p-1.5 border border-neutral-300 rounded-4 text-xs font-mono"
                      />
                      <span className="text-neutral-400">→</span>
                      <select
                        value={m.target}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMappingEntries((prev) => prev.map((item, i) => i === idx ? { ...item, target: val } : item));
                        }}
                        className="flex-1 p-1.5 border border-neutral-300 rounded-4 text-xs"
                      >
                        <option value="company_name">company_name</option>
                        <option value="website">website</option>
                        <option value="person_name">person_name</option>
                        <option value="person_role">person_role</option>
                        <option value="email">email</option>
                        <option value="phone">phone</option>
                        <option value="industry">industry</option>
                        <option value="location">location</option>
                        <option value="company_size">company_size</option>
                        <option value="external_id">external_id</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setMappingEntries((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-neutral-400 hover:text-red-600 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestMapping}
                    disabled={testingMapping}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-6 font-semibold inline-flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{testingMapping ? "Testing…" : "Test Mapping"}</span>
                  </button>
                  {testResult && (
                    <span className="text-emerald-700 font-medium">
                      ✓ Transformation verified! Discovered company: {String(testResult.transformed.company_name || "—")}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-8 font-medium hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingConn}
                  className="px-5 py-2 bg-heat-100 hover:bg-orange-600 text-white rounded-8 font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingConn ? "Generating token…" : "Create & Reveal Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COLLECTION MODAL */}
      {collectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-12 max-w-md w-full p-6 space-y-4 shadow-xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">New Lead Collection</h3>
              <button
                type="button"
                onClick={() => setCollectionModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-800">Collection Name *</label>
                <input
                  type="text"
                  required
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  placeholder="e.g. Q4 Jewelry Retail Prospects"
                  className="w-full p-2.5 border border-neutral-300 rounded-6 text-xs text-neutral-900 focus:outline-none focus:border-heat-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-800">Description</label>
                <textarea
                  rows={2}
                  value={newCollDesc}
                  onChange={(e) => setNewCollDesc(e.target.value)}
                  placeholder="Purpose or context of this prospect collection..."
                  className="w-full p-2.5 border border-neutral-300 rounded-6 text-xs text-neutral-900 focus:outline-none focus:border-heat-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-800">Qualification Mode</label>
                  <select
                    value={newCollMode}
                    onChange={(e) => setNewCollMode(e.target.value as QualificationMode)}
                    className="w-full p-2 border border-neutral-300 rounded-6 text-xs text-neutral-900"
                  >
                    <option value="strict">Strict</option>
                    <option value="best_match">Best Match</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-800">Required Contact</label>
                  <select
                    value={newCollContact}
                    onChange={(e) => setNewCollContact(e.target.value as any)}
                    className="w-full p-2 border border-neutral-300 rounded-6 text-xs text-neutral-900"
                  >
                    <option value="none">None</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="either">Either</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-8 font-medium hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingColl}
                  className="px-5 py-2 bg-heat-100 hover:bg-orange-600 text-white rounded-8 font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingColl ? "Creating…" : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
