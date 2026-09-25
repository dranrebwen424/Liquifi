import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const button = read("components/profile/ChangePasswordButton.tsx");
const startForm = read("components/profile/ChangePasswordForm.tsx");
const otpForm = read("components/profile/ChangePasswordOtpForm.tsx");
const otpPage = read("app/profile/change-password/otp/page.tsx");
const newPasswordForm = read("components/profile/NewPasswordForm.tsx");
const newPasswordPage = read("app/profile/change-password/new/page.tsx");
const success = read("components/profile/ChangePasswordSuccess.tsx");
const verifyRoute = read("app/api/auth/change-password/verify/route.ts");
const otpVerifyRoute = read("app/api/auth/otp/verify/route.ts");
const forgotPage = read("app/(auth)/forgot-password/page.tsx");
const resetPage = read("app/(auth)/change-password/page.tsx");
const proxy = read("proxy.ts");

assert.match(button, /href="\/profile\/change-password"/, "profile action must link to the dedicated page");
assert.doesNotMatch(button, /useState|api\/auth\/otp|window\.location/, "profile action must not toggle or start OTP inline");
assert.match(startForm, /api\/auth\/change-password\/verify/, "start page must verify the current password");
assert.match(startForm, /profile\/change-password\/otp/, "start page must continue to the OTP page");
assert.doesNotMatch(startForm, /newPassword/, "start page must not carry a new password across pages");
assert.match(otpForm, /intent: "change"/, "OTP page must use the authenticated change intent");
assert.match(otpPage, /PASSWORD_CHANGE_COOKIE/, "OTP route must require the current-password marker cookie");
assert.match(otpForm, /profile\/change-password\/new/, "OTP page must continue to the new password page");
assert.doesNotMatch(otpForm, /data\.token|PASSWORD_CHANGE_TOKEN_KEY/, "OTP page must not expose the reset token to client state");
assert.match(otpVerifyRoute, /PASSWORD_CHANGE_TOKEN_COOKIE/, "change OTP must persist the token in an httpOnly cookie");
assert.match(otpVerifyRoute, /httpOnly: true/, "change reset token cookie must be httpOnly");
assert.match(newPasswordForm, /api\/auth\/change-password/, "new password page must use the reset-token endpoint");
assert.match(newPasswordPage, /PASSWORD_CHANGE_TOKEN_COOKIE/, "new password page must require the httpOnly reset-token cookie");
assert.match(newPasswordForm, /profile\/change-password\/success/, "new password page must continue to success");
assert.match(success, /REDIRECT_SECONDS = 10/, "success page must redirect after ten seconds");
assert.match(success, /Return to Home/, "success page must expose the home button");
assert.match(verifyRoute, /getCurrentUser/, "password verification must derive the user from the session");
assert.doesNotMatch(verifyRoute, /split\("\."\)|base64url/, "password verification must not decode an unverified JWT");
assert.match(otpVerifyRoute, /intent === "change"/, "change OTP must be session-bound");
assert.match(proxy, /"\/profile"/, "profile change pages must be protected");
assert.match(forgotPage, /intent: "reset"/, "forgot password must keep the reset OTP flow");
assert.match(resetPage, /api\/auth\/change-password/, "public reset page must keep the reset-token flow");

console.log("profile change password checks passed");
