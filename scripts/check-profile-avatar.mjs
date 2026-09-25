import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("scripts/sql/avatar-key.sql");
const storage = read("lib/storage.ts");
const route = read("app/api/profile/avatar/route.ts");
const uploader = read("components/profile/AvatarUploader.tsx");
const profile = read("components/profile/ProfileView.tsx");
const types = read("types/index.ts");
const memberCard = read("components/admin/DepartmentMemberCard.tsx");
const memberProfile = read("components/admin/AdminMemberProfile.tsx");
const departmentPage = read("app/admin/departments/[departmentId]/page.tsx");
const roleUsersPage = read("components/admin/DepartmentRoleUsersPage.tsx");
const adminLayout = read("app/admin/layout.tsx");
const adminTopBar = read("components/admin/AdminTopBar.tsx");
const adminMobileTopBar = read("components/admin/AdminMobileTopBar.tsx");
const authGuard = read("lib/auth-guard.ts");
const layoutGuard = read("lib/layout-guard.ts");

assert.match(migration, /ADD COLUMN IF NOT EXISTS avatar_key text/, "avatar migration must add nullable avatar_key");
assert.match(storage, /const AVATAR_BUCKET = "avatars"/, "storage must use the public avatars bucket");
assert.match(storage, /avatars\/\$\{userId\}\/\$\{crypto\.randomUUID\(\)\}/, "avatar keys must be versioned per user");
assert.match(storage, /getPublicUrl\(key\)/, "avatar URL must be derived from the stored key");
assert.match(route, /export async function POST/, "avatar route must support upload");
assert.match(route, /export async function DELETE/, "avatar route must support removal");
assert.match(route, /requireRole\(\["admin", "adviser", "treasurer"\]\)/, "avatar route must allow all active roles");
assert.match(route, /accountStatus !== "active"/, "avatar route must reject inactive accounts");
assert.match(route, /image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/, "avatar route must allow only safe raster images");
assert.match(route, /\.eq\("id", user\.id\)/, "avatar writes must be scoped to the session user");
assert.doesNotMatch(route, /form\.get\("userId"\)|body\.userId/, "avatar route must not accept a client user id");
assert.match(uploader, /prepareImage/, "avatar uploader must reuse the image preparation helper");
assert.match(uploader, /router\.refresh\(\)/, "avatar uploader must refresh the server profile after changes");
assert.match(uploader, /api\/profile\/avatar/, "avatar uploader must use the avatar API");
assert.match(uploader, /aria-label="Edit profile image"/, "avatar control must be an accessible icon button");
assert.match(uploader, /absolute -bottom-1 -right-1/, "edit control must sit at the avatar's lower-right");
assert.match(profile, /avatar_key/, "profile must select the stored avatar key");
assert.match(uploader, /<img[\s\S]*imageUrl/, "avatar control must render the uploaded image");
assert.match(uploader, /initials/, "avatar control must keep the initials fallback");
assert.match(profile, /AvatarUploader/, "profile must mount the avatar uploader");
assert.match(types, /avatar_key: string \| null/, "User type must include avatar_key");
assert.match(departmentPage, /avatar_key/, "department user list must select avatar_key");
assert.match(departmentPage, /getAvatarUrl\(/, "department user list must resolve avatar URLs");
assert.match(roleUsersPage, /getAvatarUrl\(/, "role user list must resolve avatar URLs");
assert.match(memberCard, /user\.avatar_url/, "member card must render the avatar when present");
assert.match(memberCard, /initials/, "member card must keep the initials fallback");
assert.match(memberProfile, /avatarUrl/, "admin member profile must render the avatar when present");
assert.match(memberProfile, /initials/, "admin member profile must keep the initials fallback");
assert.match(authGuard, /avatar_key/, "session guard must read the current user's avatar key");
assert.match(authGuard, /avatarKey: profile\.avatar_key/, "session guard must expose avatarKey");
assert.match(layoutGuard, /avatarKey: user\.avatarKey/, "layout guard must forward avatarKey");
assert.match(adminLayout, /getAvatarUrl\(user\.avatarKey, insforge\)/, "admin layout must resolve the admin avatar URL");
assert.equal(
  adminLayout.match(/adminAvatarUrl=\{adminAvatarUrl\}/g)?.length,
  2,
  "admin layout must pass the avatar URL to both top bars",
);
assert.match(adminTopBar, /adminAvatarUrl \? \(/, "admin desktop top bar must render the avatar");
assert.match(adminMobileTopBar, /adminAvatarUrl \? \(/, "admin mobile top bar must render the avatar");
assert.match(memberCard, /<img/, "other users' avatars are read-only images, never an edit control");
assert.doesNotMatch(memberCard, /api\/profile\/avatar/, "member card must not expose avatar upload");
assert.doesNotMatch(memberProfile, /api\/profile\/avatar/, "member profile must not expose avatar upload");

console.log("profile avatar checks passed");
