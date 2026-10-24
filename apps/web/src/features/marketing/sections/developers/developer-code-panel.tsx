"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Copy, Check, FileCode2 } from "lucide-react";
import {
  CODE_SNIPPETS,
  type CodeSnippet,
} from "./code-snippets";

export function DeveloperCodePanel() {
  const [activeTabId, setActiveTabId] = useState<"widget" | "http" | "mcp">("widget");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyRequestRef = useRef(0);

  const tabRefs = useRef<{ [key in "widget" | "http" | "mcp"]?: HTMLButtonElement | null }>({});
  const activeSnippet: CodeSnippet = CODE_SNIPPETS[activeTabId];

  // Clear copy timer on unmount
  useEffect(() => {
    return () => {
      copyRequestRef.current += 1;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Handle tab switch
  const handleTabChange = useCallback((tabId: "widget" | "http" | "mcp") => {
    copyRequestRef.current += 1;
    setActiveTabId(tabId);
    setCopyStatus("idle");
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
  }, []);

  // Keyboard navigation for roving tabindex (ArrowLeft, ArrowRight, Home, End)
  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: "widget" | "http" | "mcp") => {
    const tabs: ("widget" | "http" | "mcp")[] = ["widget", "http", "mcp"];
    const currentIndex = tabs.indexOf(currentTab);

    let targetTab: "widget" | "http" | "mcp" | null = null;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      targetTab = tabs[(currentIndex + 1) % tabs.length];
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      targetTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
    } else if (e.key === "Home") {
      e.preventDefault();
      targetTab = tabs[0];
    } else if (e.key === "End") {
      e.preventDefault();
      targetTab = tabs[tabs.length - 1];
    }

    if (targetTab) {
      handleTabChange(targetTab);
      tabRefs.current[targetTab]?.focus();
    }
  };

  // Only acknowledge a successful copy for the still-active tab/request.
  const handleCopy = async () => {
    const request = ++copyRequestRef.current;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(activeSnippet.rawText);
      } catch {
        // Older browsers and background previews may deny the modern clipboard API.
        const previousFocus = document.activeElement as HTMLElement | null;
        const field = document.createElement("textarea");
        field.value = activeSnippet.rawText;
        field.readOnly = true;
        field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
        document.body.appendChild(field);
        try {
          field.select();
          if (!document.execCommand("copy")) throw new Error("Copy denied");
        } finally {
          field.remove();
          previousFocus?.focus({ preventScroll: true });
        }
      }
      if (request !== copyRequestRef.current) return;
      setCopyStatus("copied");
      copyTimerRef.current = setTimeout(() => setCopyStatus("idle"), 1500);
    } catch {
      if (request !== copyRequestRef.current) return;
      setCopyStatus("error");
      copyTimerRef.current = setTimeout(() => setCopyStatus("idle"), 3000);
    }
  };

  return (
    <>
      <div role="tablist" aria-label="Developer integration code examples" className="marketing-developers-choices">
        {(["widget", "http", "mcp"] as const).map(id => (
          <button key={id} type="button" ref={el => { tabRefs.current[id] = el; }}
            id={`marketing-dev-tab-${id}`} role="tab" aria-selected={activeTabId === id}
            aria-controls={`marketing-dev-panel-${id}`} tabIndex={activeTabId === id ? 0 : -1}
            onClick={() => handleTabChange(id)} onKeyDown={e => handleTabKeyDown(e, id)}
            className={`marketing-developers-choice ${activeTabId === id ? "active" : ""}`}>
            <Image unoptimized src={`/marketing/developers/${id}.webp`} width={1536} height={1024}
              sizes="(max-width: 767px) 90vw, 360px" alt="" />
            <span className="marketing-developers-choice-title">{CODE_SNIPPETS[id].tabLabel}</span>
            <span className="marketing-developers-choice-description">{id === "widget" ? "Add chat to your website." : id === "http" ? "Call the services you use." : "Connect your existing servers."}</span>
          </button>
        ))}
      </div>
      <div className="marketing-developers-panel">
      <div className="marketing-developers-toolbar">
        <div className="marketing-developers-filename"><FileCode2 size={18} aria-hidden="true" /><strong>{activeSnippet.fileLabel}</strong><span>{activeSnippet.tabLabel}</span></div>
        {/* Copy Control */}
        <div className="marketing-developers-copy-container">
          <button
            type="button"
            onClick={handleCopy}
            className="marketing-developers-copy-btn"
            aria-label={
              copyStatus === "copied"
                ? "Code copied to clipboard"
                : copyStatus === "error"
                ? "Copy failed, code is selectable below"
                : `Copy ${activeSnippet.tabLabel} code snippet`
            }
          >
            {copyStatus === "copied" ? (
              <>
                <Check size={15} className="marketing-developers-copy-icon-success" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={15} aria-hidden="true" />
                <span>{copyStatus === "error" ? "Copy failed" : "Copy"}</span>
              </>
            )}
          </button>
          {/* Polite live region for screen readers */}
          <span className="sr-only" aria-live="polite" role="status">
            {copyStatus === "copied"
              ? "Code copied to clipboard"
              : copyStatus === "error"
              ? "Copy failed, code is selectable below"
              : ""}
          </span>
        </div>
      </div>

      {/* Keep both target IDs present; the inactive panel has no focusable content. */}
      {Object.values(CODE_SNIPPETS).map(snippet => (
        <div key={snippet.id} id={`marketing-dev-panel-${snippet.id}`} role="tabpanel"
          aria-labelledby={`marketing-dev-tab-${snippet.id}`} hidden={activeTabId !== snippet.id}
          className="marketing-developers-body">

          <div className="marketing-developers-code-scroll" tabIndex={activeTabId === snippet.id ? 0 : -1}
            role="region" aria-label={`${snippet.tabLabel} code viewport`}>
            <pre className="marketing-developers-pre"><code className="marketing-developers-code">
              {snippet.lines.map(line => (
                <span key={line.number} className={`marketing-developers-code-line ${line.isHighlighted ? "marketing-developers-line-highlighted" : ""}`}>
                  <span className="marketing-developers-line-number" aria-hidden="true">{line.number}</span>
                  <span className="marketing-developers-line-content">
                    {line.tokens.map((token, idx) => <span key={idx} className={`marketing-developers-token marketing-developers-token-${token.type || "plain"}`}>{token.text}</span>)}
                  </span>
                </span>
              ))}
            </code></pre>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
