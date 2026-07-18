"use client";

import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/EventForm";
import { createEvent } from "@/actions/events";

export default function NewEventPage() {
  const router = useRouter();

  return (
    <EventForm
      onSubmit={async (name, budgetTotal) => {
        const result = await createEvent(name, budgetTotal);
        if (result.success) {
          router.push("/treasurer/home");
        } else {
          throw new Error(result.error);
        }
      }}
    />
  );
}
