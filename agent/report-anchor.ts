import { createHash } from "crypto";
import { ethers } from "ethers";

export type ReportAnchorInput = {
  fsDocumentNumber: string;
  pdfBytes: Uint8Array;
  entryIdsAndAmounts: { id: string; amount: number }[];
};

/**
 * Polygon hash-anchoring for an approved report — soft-fail by design.
 * One self-transaction per approved report. If the RPC keys are missing or
 * any step fails, we log and return null: the approval already happened and
 * must never be blocked by the chain.
 */
export async function anchorReport(input: ReportAnchorInput): Promise<string | null> {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  if (!rpcUrl || !privateKey) {
    console.warn(
      "[report-anchor] POLYGON_RPC_URL / POLYGON_PRIVATE_KEY missing — skipping anchor",
    );
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // SHA-256 over (fs_document_number + PDF bytes + entry IDs/amounts)
    const hash = createHash("sha256")
      .update(input.fsDocumentNumber)
      .update(Buffer.from(input.pdfBytes))
      .update(JSON.stringify(input.entryIdsAndAmounts))
      .digest("hex");

    const tx = await wallet.sendTransaction({
      to: wallet.address, // self-transaction — the hash lives in tx data
      value: 0,
      data: "0x" + hash,
    });
    await tx.wait();

    return tx.hash;
  } catch (err) {
    console.error("[report-anchor] anchoring failed:", err);
    return null;
  }
}
