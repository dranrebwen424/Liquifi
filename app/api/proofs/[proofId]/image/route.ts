import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { getBudgetProofBlob } from "@/lib/storage";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ proofId: string }> },
) {
  try {
    const { proofId } = await params;

    const insforge = await createInsforgeServer();
    const { data: proof, error } = await insforge.database
      .from("budget_proofs")
      .select("id, event_id, proof_url")
      .eq("id", proofId)
      .single();

    if (error || !proof || !proof.proof_url) {
      return errorResponse("Proof not found.", 404);
    }

    const { data: event, error: eventError } = await insforge.database
      .from("events")
      .select("department_id")
      .eq("id", proof.event_id)
      .single();
    if (eventError || !event) {
      return errorResponse("Event not found.", 404);
    }

    // Treasurers/advisers scoped to the owning department; admin unrestricted
    await requireRole(["treasurer", "adviser", "admin"], event.department_id);

    const blob = await getBudgetProofBlob(proofId);
    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/proofs/image]", err);
    return errorResponse("Something went wrong.", 500);
  }
}