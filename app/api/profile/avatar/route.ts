import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  deleteAvatarBlob,
  uploadAvatar,
  type AvatarExtension,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, AvatarExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function requireActiveUser() {
  const user = await requireRole(["admin", "adviser", "treasurer"]);
  if (user.accountStatus !== "active") {
    throw new AuthError("forbidden_role", "Only active accounts can change their avatar.", 403);
  }
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    const extension = image instanceof File ? MIME_EXTENSIONS[image.type] : undefined;

    if (!(image instanceof File)) {
      return errorResponse("Image is required.", 400);
    }
    if (!extension) {
      return errorResponse("Upload a JPG, PNG, or WEBP image.", 415);
    }
    if (image.size > MAX_SIZE) {
      return errorResponse("Image is too large (max 10MB).", 413);
    }

    const user = await requireActiveUser();
    const insforge = await createInsforgeServer();
    const { data: profile, error: profileError } = await insforge.database
      .from("users")
      .select("avatar_key")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[api/profile/avatar] profile lookup failed:", profileError);
      return errorResponse("Profile not found.", 404);
    }

    const uploaded = await uploadAvatar(user.id, image, extension);
    const { data: updated, error: updateError } = await insforge.database
      .from("users")
      .update({ avatar_key: uploaded.key })
      .eq("id", user.id)
      .select("avatar_key")
      .maybeSingle();

    if (updateError || !updated) {
      await deleteAvatarBlob(uploaded.key);
      console.error("[api/profile/avatar] profile update failed:", updateError);
      return errorResponse("We couldn't save your avatar. Please try again.", 500);
    }

    if (profile.avatar_key && profile.avatar_key !== uploaded.key) {
      await deleteAvatarBlob(profile.avatar_key);
    }

    return NextResponse.json({ success: true, url: uploaded.url });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    console.error("[api/profile/avatar]", error);
    return errorResponse("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE() {
  try {
    const user = await requireActiveUser();
    const insforge = await createInsforgeServer();
    const { data: profile, error: profileError } = await insforge.database
      .from("users")
      .select("avatar_key")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[api/profile/avatar] profile lookup failed:", profileError);
      return errorResponse("Profile not found.", 404);
    }
    if (!profile.avatar_key) return NextResponse.json({ success: true });

    const { data: updated, error: updateError } = await insforge.database
      .from("users")
      .update({ avatar_key: null })
      .eq("id", user.id)
      .select("avatar_key")
      .maybeSingle();

    if (updateError || !updated) {
      console.error("[api/profile/avatar] avatar clear failed:", updateError);
      return errorResponse("We couldn't remove your avatar. Please try again.", 500);
    }

    await deleteAvatarBlob(profile.avatar_key);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    console.error("[api/profile/avatar]", error);
    return errorResponse("Something went wrong. Please try again.", 500);
  }
}
