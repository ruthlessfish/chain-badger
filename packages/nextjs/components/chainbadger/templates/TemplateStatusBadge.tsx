import { TemplateStatus } from "~~/types/badge";

const STATUS_CONFIG: Record<TemplateStatus, { label: string; classes: string }> = {
  claimable: { label: "Claimable", classes: "badge-success" },
  paused: { label: "Paused", classes: "badge-warning" },
  "sold-out": { label: "Sold Out", classes: "badge-error" },
  archived: { label: "Archived", classes: "badge-ghost" },
};

interface Props {
  status: TemplateStatus;
  className?: string;
}

export function TemplateStatusBadge({ status, className = "" }: Props) {
  const { label, classes } = STATUS_CONFIG[status];
  return <span className={`badge badge-sm font-semibold ${classes} ${className}`}>{label}</span>;
}
