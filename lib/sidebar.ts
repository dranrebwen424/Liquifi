/**
 * Sidebar collapse state, shared.
 *
 * The storage key lives here because three places read it: the pre-hydration
 * script in app/layout.tsx, the sidebar, and the content shell. The width
 * values themselves live in app/globals.css beside --sidebar-width, so the
 * sidebar and the content column can never disagree (they used to: 72/240 vs
 * 64/240, written from two different useEffects).
 */
export const SIDEBAR_COLLAPSED_KEY = "liquifi:sidebar-collapsed";

/**
 * Runs before first paint, in <head>.
 *
 * --sidebar-width drives the content column's left padding
 * (lg:pl-[calc(var(--sidebar-width)+48px)]), so when it was only set from a
 * useEffect the first frame had an invalid calc — padding-left collapsed to 0 —
 * and the page then reflowed to full width ~300ms after hydration, growing the
 * document while you were already scrolling to the bottom. Collapsed is the CSS
 * default, so only the expanded case needs writing here.
 */
export const SIDEBAR_INIT_SCRIPT = `try{if(localStorage.getItem("${SIDEBAR_COLLAPSED_KEY}")==="false")document.documentElement.dataset.sidebar="expanded"}catch(e){}`;
