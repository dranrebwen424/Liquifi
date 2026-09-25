import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const profile = read("components/profile/ProfileView.tsx");
const adminPage = read("app/admin/profile/page.tsx");
const mobileTopBar = read("components/treasurer/MobileTopBar.tsx");
const memberProfile = read("components/admin/AdminMemberProfile.tsx");

assert.match(profile, /created_at/, "profile must render the joined date");
assert.doesNotMatch(profile, /otp_verified_at/, "profile must omit email verification history");
assert.doesNotMatch(profile, /approved_at/, "profile must omit approval history");
assert.match(profile, /Account details/, "profile must include the account details section");
assert.match(profile, /Preferences/, "profile must include the preferences section");
assert.match(profile, /max-w-xl/, "profile must stay single-column on desktop");
assert.doesNotMatch(profile, /lg:grid-cols/, "profile must not split into desktop columns");
assert.doesNotMatch(profile, /bg-surface-inverse/, "profile identity must use the open reference layout");
assert.match(profile, /Change password/, "profile must include the password placeholder action");
assert.match(profile, /role === "admin"/, "mobile logout must be limited to admin");
assert.match(profile, /aria-label="Back/, "mobile back control must have an accessible name");
assert.doesNotMatch(adminPage, />\s*Profile\s*</, "admin page must not render a mobile Profile title");
assert.match(mobileTopBar, /\/treasurer\/profile/, "treasurer mobile top bar must hide on profile");
assert.match(mobileTopBar, /\/adviser\/profile/, "adviser mobile top bar must hide on profile");
assert.match(memberProfile, /Back to department/, "department member profile keeps its back control");

console.log("profile redesign checks passed");
