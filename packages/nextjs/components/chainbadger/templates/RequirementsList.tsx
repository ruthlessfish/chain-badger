import { Requirements } from "~~/types/badge";
import { describeRequirements } from "~~/utils/requirementsDecoder";

interface Props {
  requirements: Requirements;
  className?: string;
}

export function RequirementsList({ requirements, className = "" }: Props) {
  const labels = describeRequirements(requirements);

  if (labels.length === 0) {
    return <p className={`text-sm text-base-content/50 italic ${className}`}>No requirements — open to everyone</p>;
  }

  return (
    <ul className={`flex flex-col gap-1 ${className}`}>
      {labels.map((label, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-base-content/80">
          <span className="text-primary">•</span>
          {label}
        </li>
      ))}
    </ul>
  );
}
