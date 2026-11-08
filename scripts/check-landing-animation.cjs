/* eslint-disable @typescript-eslint/no-require-imports -- Run the installed Lottie SVG engine without adding a browser dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Only DOM storage is simulated; keyframe interpolation and rendering use the real player.
class Element {
  constructor(tag) {
    this.tagName = tag; this.nodeName = tag; this.style = {}; this.children = []; this.childNodes = this.children;
    this.attributes = {}; this.parentNode = null; this.offsetWidth = 1280; this.offsetHeight = 760; this.textContent = "";
  }
  appendChild(child) { if (child.parentNode) child.parentNode.removeChild(child); this.children.push(child); child.parentNode = this; return child; }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; return child; }
  insertBefore(child, before) { const index = this.children.indexOf(before); if (index < 0) return this.appendChild(child); this.children.splice(index, 0, child); child.parentNode = this; return child; }
  setAttribute(key, value) { this.attributes[key] = value; }
  setAttributeNS(namespace, key, value) { this.setAttribute(key, value); }
  getAttribute(key) { return this.attributes[key]; }
  removeAttribute(key) { delete this.attributes[key]; }
  get firstChild() { return this.children[0]; }
  get lastChild() { return this.children.at(-1); }
  getContext() { return { fillRect() {}, clearRect() {}, measureText(text) { return { width: text.length * 10 }; } }; }
  getElementsByTagName() { return []; }
  getBBox() { return { x: 0, y: 0, width: 1280, height: 760 }; }
  addEventListener() {}
  removeEventListener() {}
}

global.document = {
  readyState: "complete", createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag),
  createTextNode: text => ({ textContent: text }), body: new Element("body"), head: new Element("head"),
  getElementsByTagName: () => [], getElementsByClassName: () => [], querySelectorAll: () => [], location: { href: "http://localhost:3000/" },
};
global.window = { document, devicePixelRatio: 1, location: document.location, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, navigator: { userAgent: "node" } };
global.requestAnimationFrame = window.requestAnimationFrame;

async function main() {
  const lottie = require("lottie-web");
  try {
    for (const file of ["hero-animation.json", "fina_CTA/animation.json"]) {
      const errors = [];
      const animation = lottie.loadAnimation({
        container: new Element("div"), renderer: "svg", autoplay: false, loop: true,
        animationData: JSON.parse(fs.readFileSync(path.join(__dirname, "../public/landing", file), "utf8")),
      });
      animation.addEventListener("error", event => errors.push({ frame: event.currentTime, type: event.type, message: event.nativeError?.message }));
      assert(animation.isLoaded, file + " must initialize");
      // Include half frames and return to the start to cover interpolation and a loop boundary.
      for (let frame = 0; frame < animation.totalFrames; frame += 0.5) animation.goToAndStop(frame, true);
      animation.goToAndStop(0, true);
      let loops = 0;
      animation.addEventListener("loopComplete", () => { loops++; });
      animation.play();
      assert.equal(animation.isPaused, false);
      animation.advanceTime((animation.totalFrames + 1) * 1000 / animation.frameRate);
      assert.equal(loops, 1, "playback must cross the loop boundary");
      animation.pause();
      assert.equal(animation.isPaused, true);
      const pausedFrame = animation.currentFrame;
      animation.advanceTime(1000);
      assert.equal(animation.currentFrame, pausedFrame, "paused playback must not advance");
      animation.destroy();
      assert.deepEqual(errors, [], file + " must render every frame without replacing the animation");
    }
    console.log("PASS: both real Lottie SVG animations render all frames, fractional interpolation and loop boundaries without errors.");
  } finally { lottie.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
