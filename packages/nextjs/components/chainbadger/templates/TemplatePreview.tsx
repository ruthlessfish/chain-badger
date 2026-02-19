import Image from "next/image";
import { RequirementsList } from "./RequirementsList";
import { Requirements } from "~~/types/badge";

interface Props {
  name: string;
  description: string;
  imageUri: string;
  maxClaims: string;
  requirements: Requirements;
}

export function TemplatePreview({ name, description, imageUri, maxClaims, requirements }: Props) {
  const displayName = name || "Untitled Badge";
  const cap = maxClaims && Number(maxClaims) > 0 ? `${maxClaims} max claims` : "Unlimited supply";

  return (
    <div className="card bg-base-200 border border-primary/30 shadow-md w-full">
      <div className="card-body p-5 gap-4">
        <h3 className="text-xs uppercase tracking-widest text-base-content/40 font-semibold">Preview</h3>

        <div className="flex gap-4 items-start">
          {/* Image */}
          <div className="w-16 h-16 shrink-0 rounded-xl bg-base-300 flex items-center justify-center overflow-hidden">
            {imageUri ? (
              <Image
                src={imageUri}
                alt={displayName}
                width={64}
                height={64}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-3xl">🏅</span>
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-bold text-base leading-tight">{displayName}</p>
            {description && <p className="text-sm text-base-content/60 line-clamp-2">{description}</p>}
            <p className="text-xs text-base-content/40 mt-0.5">{cap}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-base-content/50 mb-1.5">Requirements</p>
          <RequirementsList requirements={requirements} />
        </div>
      </div>
    </div>
  );
}
