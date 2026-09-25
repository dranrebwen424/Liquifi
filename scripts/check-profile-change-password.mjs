import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

const button = read("components/profile/ChangePasswordButton.tsx");
const startForm = read("components/profile/ChangePasswordForm.tsx");
const otpForm = read("components/profile/ChangePasswordOtpForm.tsx");
const otpPage = read("app/profile/change-password/otp/page.tsx");
const provider = read("components/profile/PasswordChangeProvider.tsx");
const layout = read("app/profile/change-password/layout.tsx");
const success = read("components/profile/ChangePasswordSuccess.tsx");
const verifyRoute = read("app/api/auth/change-password/verify/route.ts");
const otpVerifyRoute = read("app/api/auth/otp/verify/route.ts");
const forgotPage = read("app/(auth)/forgot-password/page.tsx");
const resetPage = read("app/(auth)/change-password/page.tsx");
const proxy = read("proxy.ts");

assert.match(button, /href="\/profile\/change-password"/, "profile action must link to the dedicated page");
assert.doesNotMatch(button, /useState|api\/auth\/otp|window\.location/, "profile action must not toggle or start OTP inline");
assert.match(startForm, /api\/auth\/change-password\/verify/, "start page must verify the current password");
assert.match(startForm, /Current password[\s\S]*New password[\s\S]*Confirm password/, "start page must collect all password fields");
assert.match(startForm, /setNewPassword\(newPassword\)/, "start page must hand the new password to the in-memory provider");
assert.doesNotMatch(startForm, /sessionStorage\.(setItem|getItem)\([^)]*newPassword/i, "start page must not persist the new password");
assert.match(layout, /PasswordChangeProvider/, "change-password layout must own the in-memory flow state");
assert.match(provider, /usePendingNewPassword/, "provider must expose pending new password state");
assert.match(otpForm, /intent: "change"/, "OTP page must use the authenticated change intent");
assert.match(otpPage, /PASSWORD_CHANGE_COOKIE/, "OTP route must require the current-password marker cookie");
assert.match(otpForm, /api\/auth\/change-password/, "OTP page must complete the password mutation");
assert.match(otpForm, /profile\/change-password\/success/, "OTP page must continue to success");
assert.doesNotMatch(otpForm, /data\.token|PASSWORD_CHANGE_TOKEN_KEY/, "OTP page must not expose the reset token to client state");
assert.doesNotMatch(otpForm, /(sessionStorage|localStorage|document\.cookie)[^;\n]*newPassword/i, "OTP page must not persist the new password");
assert.doesNotMatch(otpForm, /profile\/change-password\/new/, "two-step flow must not retain the old new-password route");
assert.ok(!exists("app/profile/change-password/new/page.tsx"), "old new-password page must be removed");
assert.ok(!exists("components/profile/NewPasswordForm.tsx"), "old new-password form must be removed");
assert.match(otpVerifyRoute, /PASSWORD_CHANGE_TOKEN_COOKIE/, "change OTP must persist the token in an httpOnly cookie");
assert.match(otpVerifyRoute, /httpOnly: true/, "change reset token cookie must be httpOnly");
assert.match(success, /REDIRECT_SECONDS = 10/, "success page must redirect after ten seconds");
assert.match(success, /Return to Home/, "success page must expose the home button");
assert.match(verifyRoute, /getCurrentUser/, "password verification must derive the user from the session");
assert.doesNotMatch(verifyRoute, /split\("\."\)|base64url/, "password verification must not decode an unverified JWT");
assert.match(otpVerifyRoute, /intent === "change"/, "change OTP must be session-bound");
assert.match(proxy, /"\/profile"/, "profile change pages must be protected");
assert.match(forgotPage, /intent: "reset"/, "forgot password must keep the reset OTP flow");
assert.match(resetPage, /api\/auth\/change-password/, "public reset page must keep the reset-token flow");

console.log("profile change password checks passed");
