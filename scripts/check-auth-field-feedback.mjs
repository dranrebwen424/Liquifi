import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const cache = new Map();
function load(path, react = React) {
  if (react === React && cache.has(path)) return cache.get(path);
  const loadedModule = { exports: {} };
  const js = ts.transpileModule(read(path), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const resolve = (name) => name === "react" ? react
    : name.startsWith("@/") ? load(`${name.slice(2)}.ts`, react) : require(name);
  new Function("require", "module", "exports", js)(resolve, loadedModule, loadedModule.exports);
  if (react === React) cache.set(path, loadedModule.exports);
  return loadedModule.exports;
}

const AuthInput = load("components/auth/AuthInput.tsx").default;
for (const error of [false, true, "Passwords don't match."]) {
  const html = renderToStaticMarkup(React.createElement(AuthInput, {
    id: "password", label: "Password", type: "password", value: "typed password",
    onChange: () => {}, required: true, error, validationAttempt: 2,
  }));
  const button = html.match(/<button[^>]+>/)?.[0];
  assert.ok(button, "Password visibility remains available in every state");
  assert.match(button, /type="button"/, "Visibility must not submit the form");
  assert.match(button, /aria-label="Show password"/);
  assert.match(button, /aria-pressed="false"/);
  assert.doesNotMatch(button, /bg-surface|inset-y-0/, "Visibility must not paint over the input border");
  assert.match(button, /h-11 w-11/, "Visibility keeps a touch sized target");
  assert.match(button, /focus-visible:ring-2/, "Visibility retains keyboard focus feedback");
  assert.match(html, /value="typed password"/, "Error feedback must preserve typed values");
  assert.match(html, new RegExp(`aria-invalid="${Boolean(error)}"`));
  if (error) {
    assert.match(html, /border-error/);
    assert.match(html, /aria-describedby="password-error"/);
    assert.match(html, /id="password-error"/);
    assert.ok(html.includes(typeof error === "string" ? "Passwords don&#x27;t match." : "Please enter your password."));
  } else {
    assert.doesNotMatch(html, /role="alert"|aria-describedby/);
  }
}
const AuthOtpInput = load("components/auth/AuthOtpInput.tsx").default;
const otp = renderToStaticMarkup(React.createElement(AuthOtpInput, {
  value: "12", onChange: () => {}, error: "Enter the complete 6-digit code.",
}));
assert.equal((otp.match(/aria-invalid="true"/g) || []).length, 6);
assert.match(otp, /Enter the complete 6-digit code\./);

// The browser is the boundary: capture the real hook's effects and native animation calls.
let effect;
let dependencies;
let reducedMotion = false;
const animations = [];
const element = {
  animate(frames, options) {
    const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
    animations.push(animation);
    return animation;
  },
};
const browserReact = {
  useRef: () => ({ current: element }),
  useEffect: (callback, deps) => { effect = callback; dependencies = deps; },
};
const { useInvalidFieldShake: runShakeEffect } = load("components/auth/useInvalidFieldShake.ts", browserReact);
const previousWindow = globalThis.window;
globalThis.window = { matchMedia: (query) => {
  assert.equal(query, "(prefers-reduced-motion: reduce)");
  return { matches: reducedMotion };
} };
try {
  runShakeEffect(false, 0);
  effect();
  assert.equal(animations.length, 0, "Valid fields do not shake");
  for (const attempt of [1, 2]) {
    runShakeEffect(true, attempt);
    assert.deepEqual(dependencies, [true, attempt], "Repeated invalid submissions retrigger feedback");
    const cleanup = effect();
    assert.equal(animations.length, attempt);
    assert.equal(animations.at(-1).options.duration, 250);
    assert.equal(animations.at(-1).frames[0].transform, "translateX(0px)");
    assert.equal(animations.at(-1).frames.at(-1).transform, "translateX(0px)");
    cleanup();
    assert.ok(animations.at(-1).cancelled, "Correction and unmount cancel animation");
  }
  reducedMotion = true;
  runShakeEffect(true, 3);
  effect();
  assert.equal(animations.length, 2, "Reduced motion suppresses the shake");
} finally {
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}

// Keep every existing form connected to the shared feedback, without changing auth endpoints.
for (const path of [
  "app/(auth)/login/page.tsx", "app/(auth)/forgot-password/page.tsx",
  "app/(auth)/change-password/page.tsx", "components/profile/ChangePasswordForm.tsx",
  "app/(auth)/otp/page.tsx", "components/profile/ChangePasswordOtpForm.tsx",
]) {
  const source = read(path);
  const inputs = source.match(/<Auth(?:Otp)?Input\b/g) || [];
  assert.equal((source.match(/validationAttempt=\{submitted\}/g) || []).length, inputs.length, path);
  assert.match(source, /setSubmitted\(\(attempt\) => attempt \+ 1\)/, path);
  assert.match(source, /noValidate/, path);
}
for (const path of ["app/(auth)/login/page.tsx", "app/(auth)/forgot-password/page.tsx"]) {
  assert.match(read(path), /validity\.typeMismatch/, "Email fields use native format validation");
  assert.match(read(path), /!email\.trim\(\)/, "Whitespace only email is rejected");
}
assert.match(read("app/(auth)/login/page.tsx"), /setCredentialsInvalid\(res\.status === 401\)/);
assert.match(read("components/profile/ChangePasswordForm.tsx"), /Current password is incorrect\./);
for (const path of ["app/(auth)/change-password/page.tsx", "components/profile/ChangePasswordForm.tsx"]) {
  assert.match(read(path), /error=\{submitted > 0 && \(!newPassword \|\| \(newPassword\.length < MIN_PASSWORD_LENGTH/);
  assert.match(read(path), /error=\{submitted > 0 && \(!confirm(?:Password)? \|\| \(newPassword !== confirm/);
}
console.log("Auth field feedback checks passed (render, outline, motion, reduced motion, repeat submissions, and flow wiring).");
