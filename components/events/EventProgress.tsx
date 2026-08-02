import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type EventProgressProps = {
  status: "open" | "archived";
  isLocked: boolean;
};

const steps = [
  { label: "Open" },
  { label: "Report Pending" },
  { label: "Approved" },
];

export function EventProgress({ status, isLocked }: EventProgressProps) {
  // Determine active step index (0-based)
  let activeStep = 0; // Open
  if (status === "archived") {
    activeStep = 2; // Approved (archived = fully done)
  } else if (isLocked) {
    activeStep = 1; // Report Pending
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < activeStep;
          const isActive = i === activeStep;

          return (
            <div key={step.label} className="flex flex-1 items-center">
              {/* Dot + label */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isCompleted && "bg-success text-white",
                    isActive && "bg-accent text-accent-foreground ring-2 ring-accent/20",
                    !isCompleted && !isActive && "border-2 border-border bg-surface text-text-muted",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {/* Label */}
                <p
                  className={cn(
                    "mt-2 text-xs font-medium whitespace-nowrap",
                    (isCompleted || isActive) ? "text-text-primary" : "text-text-muted",
                  )}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mb-5 h-1 flex-1",
                    i < activeStep ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
