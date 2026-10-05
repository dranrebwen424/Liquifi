import type { ReactElement } from "react";

type Props = {
  flow: "reset" | "change" | "signup";
  step: number;
  complete?: boolean;
};

const STEPS = {
  reset: ["Your email", "Verify email", "New password"],
  change: ["New password", "Verify email", "Complete"],
  signup: ["Your name", "Account details", "Your council"],
};

export function AuthFlowProgress({ flow, step, complete = false }: Props): ReactElement {
  return (
    <ol aria-label={flow === "signup" ? "Signup progress" : "Password progress"} className="grid grid-cols-3 gap-2">
      {STEPS[flow].map((label, index) => {
        const done = complete || index + 1 < step;
        const current = !complete && index + 1 === step;

        return (
          <li key={label} aria-current={current ? "step" : undefined} className="min-w-0">
            <div aria-hidden="true" className={`h-1 rounded-full ${done ? "bg-success" : "bg-accent"}`} />
            <span className="sr-only">{label}{done ? ", completed" : current ? ", current step" : ", upcoming"}</span>
          </li>
        );
      })}
    </ol>
  );
}
