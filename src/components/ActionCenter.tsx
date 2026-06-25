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
  1: "bg-danger-subtle text-danger border-danger/20",
  2: "bg-pumpkin-subtle text-pumpkin border-pumpkin/20",
  3: "bg-informative-subtle text-informative border-informative/20",
};

const BUTTON_LABEL: Record<ActionKey, string> = {
  reengagement: "Preview email drafts",
  resale: "Preview listings",
  broker: "Preview webhooks",
};

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap overflow-x-auto rounded-lg border border-line bg-canvas p-4 font-mono text-xs text-ink-secondary">
      {children}
    </pre>
  );
}

function SimNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs italic text-ink-tertiary">{children}</p>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-ink-tertiary transition-colors hover:bg-canvas hover:text-ink"
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
        <p className="text-sm text-ink-tertiary">No matching at-risk accounts found.</p>
      )}
      {items.map((item) => {
        const draft = buildEmailDraft(item);
        return (
          <div
            key={item.occId}
            className="overflow-hidden rounded-lg border border-line bg-canvas"
          >
            <div className="border-b border-line bg-surface px-4 py-2.5">
              <div className="text-sm font-medium text-ink">{item.companyName}</div>
              <div className="text-xs text-ink-tertiary">
                {item.officeName} · {item.buildingName} {item.floor}
              </div>
            </div>
            <div className="space-y-1 px-4 py-3 font-mono text-xs">
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-ink-tertiary">To:</span>
                <span className="text-ink-secondary">{draft.to}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-ink-tertiary">Subject:</span>
                <span className="text-ink-secondary">{draft.subject}</span>
              </div>
              <div className="mt-2 whitespace-pre-wrap border-t border-line pt-2 leading-relaxed text-ink-secondary">
                {draft.body}
              </div>
            </div>
          </div>
        );
      })}
      <div>
        <button
          type="button"
          className="rounded-md bg-pumpkin px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pumpkin-hover"
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
        <p className="text-sm text-ink-tertiary">No matching vacant rooms found.</p>
      )}
      {items.map((v) => {
        const listing = buildResaleListing(v);
        return (
          <div key={v.roomId} className="space-y-2">
            <div className="text-sm font-medium text-ink">{listing.headline}</div>
            <div className="text-xs text-ink-tertiary">
              Marketplace:{" "}
              <span className="font-medium text-pumpkin">{listing.marketplace}</span>
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
        <p className="text-sm text-ink-tertiary">No matching at-risk accounts found.</p>
      )}
      {items.map((item) => {
        const payload = buildPipelineWebhook(item);
        return (
          <div key={item.occId} className="space-y-2">
            <div className="text-sm font-medium text-ink">
              {item.companyName}{" "}
              <span className="font-normal text-ink-tertiary">· {item.roomId}</span>
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
    <section className="space-y-5" id="actions">
      <div>
        <h2 className="font-barlow text-xl font-bold tracking-wide text-ink">
          Top 3 Revenue Recovery Actions
        </h2>
        <p className="text-sm text-ink-tertiary">
          Prioritized plays the system can execute this week.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <div
            key={action.key}
            className="flex flex-col rounded-xl border border-line bg-surface p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${
                  RANK_CHIP[action.rank] ?? RANK_CHIP[3]
                }`}
              >
                {action.rank}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-ink-tertiary">
                {action.targets.length} target
                {action.targets.length === 1 ? "" : "s"}
              </span>
            </div>

            <h3 className="text-base font-semibold leading-snug text-ink">
              {action.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-pumpkin">{action.systemAction}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-tertiary">
              {action.detail}
            </p>

            <div className="mt-4 border-t border-line pt-4">
              <div className="text-[11px] uppercase tracking-wider text-ink-tertiary">
                Estimated recovery
              </div>
              <div className="text-2xl font-bold tracking-tight text-positive">
                {php(action.estimatedRecovery)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(action.key)}
              className="mt-4 w-full rounded-md bg-pumpkin px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pumpkin-hover"
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
