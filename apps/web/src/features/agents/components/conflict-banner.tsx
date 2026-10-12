"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  currentVersion: number;
  onReload: () => void;
};

export function ConflictBanner({ currentVersion, onReload }: Props) {
  return (
    <div className="rounded-12 border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-900">
            Version Conflict Detected (HTTP 409)
          </h4>
          <p className="mt-1 text-xs text-amber-800 leading-relaxed">
            Another team member or window saved changes while you were editing. To prevent
            overwriting their work, saving is locked until you reload the latest state (v{currentVersion}).
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Latest Server Version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
