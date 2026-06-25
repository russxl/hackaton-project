"use client";

import { useEffect, useState } from "react";
import type { Analysis, RiskItem, VacantItem } from "@/lib/types";
import { php } from "@/lib/format";
import {
  buildEmailDraft,
  buildPipelineWebhook,
  buildResaleListing,
} from "@/lib/actions";

type ActionKey = "reengagement" | "resale" | "broker";

const RANK_CHIP: Record<number, string> = {
  1: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  2: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  3: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
};

const BUTTON_LABEL: Record<ActionKey, string> = {
  reengagement: "Preview email drafts",
  resale: "Preview listings",
  broker: "Preview webhooks",
};

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs overflow-x-auto text-slate-300 whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function SimNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-slate-500 italic">{children}</p>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-8 w-8 grid place-items-center rounded-lg border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ReengagementBody({ analysis, targets }: { analysis: Analysis; targets: string[] }) {
  const items = targets
    .map((id) => analysis.riskItems.find((r) => r.roomId === id || r.clientId === id))
    .filter(Boolean) as RiskItem[];

  return (
    <div className="space-y-5">
      {items.length === 0 && (
        <p className="text-sm text-slate-400">No matching at-risk accounts found.</p>
      )}
      {items.map((item) => {
        const draft = buildEmailDraft(item);
        return (
          <div
            key={item.occId}
            className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40"
          >
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
              <div className="text-sm font-medium text-slate-200">{item.companyName}</div>
              <div className="text-xs text-slate-400">
                {item.officeName} · {item.buildingName} {item.floor}
              </div>
            </div>
            <div className="px-4 py-3 space-y-1 font-mono text-xs">
              <div className="flex gap-2">
                <span className="text-slate-500 w-16 shrink-0">To:</span>
                <span className="text-slate-300">{draft.to}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 w-16 shrink-0">Subject:</span>
                <span className="text-slate-300">{draft.subject}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-800/70 text-slate-300 whitespace-pre-wrap leading-relaxed">
                {draft.body}
              </div>
            </div>
          </div>
        );
      })}
      <div>
        <button
          type="button"
          className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Send via Resend
        </button>
        <SimNote>Simulated — no email sent.</SimNote>
      </div>
    </div>
  );
}

function ResaleBody({ analysis, targets }: { analysis: Analysis; targets: string[] }) {
  const items = targets
    .map((id) => analysis.vacantItems.find((v) => v.roomId === id))
    .filter(Boolean) as VacantItem[];

  return (
    <div className="space-y-5">
      {items.length === 0 && (
        <p className="text-sm text-slate-400">No matching vacant rooms found.</p>
      )}
      {items.map((v) => {
        const listing = buildResaleListing(v);
        return (
          <div key={v.roomId} className="space-y-2">
            <div className="text-sm font-medium text-slate-200">{listing.headline}</div>
            <div className="text-xs text-slate-400">
              Marketplace:{" "}
              <span className="text-indigo-300">{listing.marketplace}</span>
            </div>
            <CodeBlock>{JSON.stringify(listing.payload, null, 2)}</CodeBlock>
          </div>
        );
      })}
      <SimNote>Simulated — not published.</SimNote>
    </div>
  );
}

function BrokerBody({ analysis, targets }: { analysis: Analysis; targets: string[] }) {
  const items = targets
    .map((id) => analysis.riskItems.find((r) => r.roomId === id || r.clientId === id))
    .filter(Boolean) as RiskItem[];

  return (
    <div className="space-y-5">
      {items.length === 0 && (
        <p className="text-sm text-slate-400">No matching at-risk accounts found.</p>
      )}
      {items.map((item) => {
        const payload = buildPipelineWebhook(item);
        return (
          <div key={item.occId} className="space-y-2">
            <div className="text-sm font-medium text-slate-200">
              {item.companyName}{" "}
              <span className="text-slate-500 font-normal">· {item.roomId}</span>
            </div>
            <CodeBlock>{JSON.stringify(payload, null, 2)}</CodeBlock>
          </div>
        );
      })}
      <SimNote>Simulated — no webhook fired.</SimNote>
    </div>
  );
}

export default function ActionCenter({ analysis }: { analysis: Analysis }) {
  const [open, setOpen] = useState<ActionKey | null>(null);

  const actions = [...analysis.actions]
    .filter((a) => a.rank >= 1 && a.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  const openAction = actions.find((a) => a.key === open) ?? null;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Top 3 Revenue Recovery Actions
        </h2>
        <p className="text-sm text-slate-400">
          Prioritized plays the system can execute this week.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <div
            key={action.key}
            className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${
                  RANK_CHIP[action.rank] ?? RANK_CHIP[3]
                }`}
              >
                {action.rank}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                {action.targets.length} target
                {action.targets.length === 1 ? "" : "s"}
              </span>
            </div>

            <h3 className="text-base font-semibold text-slate-100 leading-snug">
              {action.title}
            </h3>
            <p className="mt-1 text-xs text-indigo-300/90">{action.systemAction}</p>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed flex-1">
              {action.detail}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">
                Estimated recovery
              </div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                {php(action.estimatedRecovery)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(action.key)}
              className="mt-4 w-full bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {BUTTON_LABEL[action.key]}
            </button>
          </div>
        ))}
      </div>

      {openAction && (
        <Modal title={openAction.title} onClose={() => setOpen(null)}>
          {openAction.key === "reengagement" && (
            <ReengagementBody analysis={analysis} targets={openAction.targets} />
          )}
          {openAction.key === "resale" && (
            <ResaleBody analysis={analysis} targets={openAction.targets} />
          )}
          {openAction.key === "broker" && (
            <BrokerBody analysis={analysis} targets={openAction.targets} />
          )}
        </Modal>
      )}
    </section>
  );
}
