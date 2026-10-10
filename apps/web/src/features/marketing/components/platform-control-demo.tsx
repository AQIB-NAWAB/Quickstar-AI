"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Folder, Lock, Minus, Pencil, RotateCcw, Shield } from "lucide-react";

export type PlatformViewTab = "versions" | "workspaces" | "permissions";
const INITIAL_DRAFT = "Keep answers concise.\nOffer a helpful next step.";

function Paper({
  side,
  children,
  accent = false,
}: {
  side: "draft" | "published";
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`platform-control-paper platform-control-paper--${side}${accent ? " platform-control-paper--accent" : ""}`}
    >
      <svg
        className="platform-control-paper-art"
        viewBox="0 0 410 430"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="408"
          height="428"
          rx="3"
          fill="#fff"
          stroke="#35353a"
          strokeWidth="1.2"
        />
        <path d="M20 18V412" stroke={accent ? "#FF571A" : "#58585f"} strokeWidth="1.1" />
        {[110, 149, 188, 227, 266, 305, 344, 383].map((y) => (
          <path key={y} d={`M47 ${y}H388`} stroke="#dedee1" strokeWidth="1" />
        ))}
      </svg>
      <div className="platform-control-paper-content">{children}</div>
    </div>
  );
}

export function PlatformControlDemo({ activeTab }: { activeTab: PlatformViewTab }) {
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [editing, setEditing] = useState(false);
  const [workspace, setWorkspace] = useState("support");
  const [role, setRole] = useState("owner");
  const [status, setStatus] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing && activeTab === "versions") textarea.current?.focus();
  }, [editing, activeTab]);
  const lines = draft.split("\n");
  const version = activeTab === "versions";
  return (
    <div className="platform-control-demo">
      <span role="status" className="sr-only">
        {status}
      </span>
      <div className="platform-control-stage">
        <svg className="platform-control-connectors" viewBox="0 0 1000 700" aria-hidden="true">
          {version ? (
            <>
              <path
                d="M490 646C490 575 238 553 229 465"
                fill="none"
                stroke="#FF571A"
                strokeWidth="1.35"
              />
              <path d="M490 646L763 557" fill="none" stroke="#85858f" strokeWidth="1.35" />
              <path d="m224 483 5-14 8 12" fill="#FF571A" />
              <path d="m750 559 13-2-8 11" fill="#85858f" />
              <circle cx="229" cy="452" r="7" fill="#FF571A" />
              <circle cx="776" cy="550" r="6" fill="#FAFAF8" stroke="#35353a" strokeWidth="1.8" />
              <circle cx="490" cy="646" r="8" fill="#FAFAF8" stroke="#35353a" strokeWidth="2" />
              <text x="301" y="528" fill="#FF571A" fontSize="18">
                Edit here
              </text>
              <text x="665" y="602" fill="#6f717b" fontSize="16">
                Conversations use this
              </text>
            </>
          ) : activeTab === "workspaces" ? (
            <>
              <path d="M40 478H410M590 594H970" stroke="#aaaab1" strokeWidth="1.2" fill="none" />
            </>
          ) : (
            <path
              d="M431 215C505 215 503 330 584 330"
              fill="none"
              stroke="#FF571A"
              strokeWidth="1.35"
            />
          )}
        </svg>
        {version ? (
          <>
            <Paper side="draft" accent>
              <span className="platform-control-version">v2 · draft</span>
              <div className="platform-control-paper-heading">
                <Pencil aria-hidden="true" />
                <div>
                  <h3>Draft</h3>
                  <p>Changes in progress</p>
                </div>
              </div>
              <div className="platform-control-manuscript">
                {editing ? (
                  <>
                    <label className="sr-only" htmlFor="platform-draft-textarea">
                      Draft instructions
                    </label>
                    <textarea
                      id="platform-draft-textarea"
                      ref={textarea}
                      value={draft}
                      maxLength={600}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={5}
                    />
                  </>
                ) : (
                  <>
                    <p>
                      {lines[0] || (
                        <span className="platform-control-empty">No draft instruction</span>
                      )}
                    </p>
                    {lines.slice(1).map((line, i) => (
                      <p className="platform-control-edited-line" key={i}>
                        {line || "\u00a0"}
                        {i === 0 && <span className="platform-control-caret" aria-hidden="true" />}
                      </p>
                    ))}
                    {lines.slice(1).some((line) => line.trim()) && (
                      <span className="platform-control-new-instruction">Your new instruction</span>
                    )}
                  </>
                )}
              </div>
            </Paper>
            <div className="platform-control-annotation">
              <svg viewBox="0 0 16 66" aria-hidden="true">
                <path
                  d="M1 2Q10 0 10 10V23Q10 32 15 33Q10 34 10 43V56Q10 66 1 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
              <span>
                Only the <br />
                draft changes.
              </span>
            </div>
            <Paper side="published">
              <span className="platform-control-version">v1 · published</span>
              <div className="platform-control-paper-heading">
                <span className="platform-control-published-check">
                  <Check aria-hidden="true" />
                </span>
                <div>
                  <h3>Published</h3>
                  <p>Used in conversations</p>
                </div>
              </div>
              <div className="platform-control-manuscript">
                <p>Keep answers concise.</p>
              </div>
            </Paper>
          </>
        ) : activeTab === "workspaces" ? (
          <>
            {(["support", "sales"] as const).map((item, i) => (
              <Paper key={item} side={i === 0 ? "draft" : "published"} accent={workspace === item}>
                <div className="platform-control-paper-heading">
                  <Folder aria-hidden="true" />
                  <div>
                    <h3>{item === "support" ? "Support" : "Sales"} workspace</h3>
                    <p>Example workspace</p>
                  </div>
                </div>
                <div className="platform-control-manuscript platform-control-details">
                  <span>Example information</span>
                  <p>{item === "support" ? "Company handbook.pdf" : "Product guide.pdf"}</p>
                  <span>Example conversation</span>
                  <p>{item === "support" ? "Return-policy question" : "Product question"}</p>
                </div>
              </Paper>
            ))}
          </>
        ) : (
          <>
            <Paper side="draft" accent>
              <div className="platform-control-paper-heading">
                <Shield aria-hidden="true" />
                <div>
                  <h3>{role === "owner" ? "Owner" : "Analyst"}</h3>
                  <p>Example workspace role</p>
                </div>
              </div>
              <div className="platform-control-manuscript">
                <p>
                  {role === "owner"
                    ? "Read agents, edit drafts, and publish versions."
                    : "Read agents without editing drafts or publishing versions."}
                </p>
              </div>
            </Paper>
            <Paper side="published">
              <div className="platform-control-paper-heading">
                <div>
                  <h3>Allowed actions</h3>
                </div>
              </div>
              <div className="platform-control-manuscript platform-control-permissions">
                {["Read agents", "Edit agent drafts", "Publish versions"].map((label, i) => {
                  const allowed = i === 0 || role === "owner";
                  return (
                    <div key={label}>
                      <span>{label}</span>
                      <span className={allowed ? "platform-control-allowed" : ""}>
                        {allowed ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
                        {allowed ? "Allowed" : "Not allowed"}
                      </span>
                    </div>
                  );
                })}
                <p className="platform-control-lock">
                  <Lock aria-hidden="true" />
                  Secret values stay hidden.
                </p>
              </div>
            </Paper>
          </>
        )}
      </div>
      <div className="platform-control-actions">
        {version ? (
          <>
            <button
              type="button"
              onClick={() => {
                setEditing(!editing);
                setStatus(
                  editing
                    ? "Draft updated. Published instructions unchanged."
                    : "Editing the draft.",
                );
              }}
            >
              <Pencil aria-hidden="true" />
              {editing ? "Done editing" : "Edit the draft"}
            </button>
            <span className="platform-control-action-divider" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setDraft(INITIAL_DRAFT);
                setEditing(false);
                setStatus("Example reset. Published instructions unchanged.");
              }}
            >
              <RotateCcw aria-hidden="true" />
              Reset example
            </button>
          </>
        ) : (
          <fieldset className="platform-control-radio">
            <legend className="sr-only">
              {activeTab === "workspaces" ? "Example workspace" : "Example role"}
            </legend>
            {(activeTab === "workspaces" ? ["support", "sales"] : ["owner", "analyst"]).map(
              (value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={`platform-${activeTab}`}
                    value={value}
                    checked={(activeTab === "workspaces" ? workspace : role) === value}
                    onChange={() => {
                      if (activeTab === "workspaces") setWorkspace(value);
                      else setRole(value);
                      setStatus(`Selected ${value} example.`);
                    }}
                  />
                  <span>{value[0].toUpperCase() + value.slice(1)}</span>
                </label>
              ),
            )}
          </fieldset>
        )}
      </div>
      <p className="platform-control-disclaimer">
        {version
          ? "Interactive example — no live agent is changed."
          : activeTab === "workspaces"
            ? "Example workspaces — no account data is loaded."
            : "Example permissions — no team access is changed."}
      </p>
    </div>
  );
}
