import type { ReactElement } from "react";

type Props = {
  flow: "reset" | "change";
  step: 1 | 2 | 3;
  complete?: boolean;
};

export function PasswordFlowProgress({ flow, step, complete = false }: Props): ReactElement {
  const labels = flow === "reset"
    ? ["Your email", "Verify email", "New password"]
    : ["New password", "Verify email", "Complete"];

  return (
    <ol aria-label="Password progress" className="grid grid-cols-3 gap-2">
      {labels.map((label, index) => {
        const done = complete || index + 1 < step;
        const current = !complete && index + 1 === step;

        return (
          <li key={label} aria-current={current ? "step" : undefined} className="min-w-0 text-center">
            <div aria-hidden="true" className={`h-1 rounded-full ${done ? "bg-success" : "bg-accent"}`} />
            <p className={`mt-2 text-[11px] leading-4 ${done ? "text-success-foreground" : "text-text-primary"} ${current ? "font-semibold" : "font-normal"}`}>
              {label}
              <span className="sr-only">{done ? ", completed" : current ? ", current step" : ", upcoming"}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
