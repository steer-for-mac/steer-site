/* The appearance control. `data-theme` is the RESOLVED appearance and drives
 * every sheet; `data-theme-pref` is the choice. The stored key holds light or
 * dark only when FORCED -- System is the absence of the key, which is what makes
 * the choice reversible.
 *
 * The pre-paint half is _includes/scripts/theme-init.js and cannot be deferred.
 */
type Pref = "system" | "light" | "dark";

const NAME: Record<Pref, string> = { system: "System", light: "Light", dark: "Dark" };

const isPref = (v: string | null): v is Pref =>
  v === "system" || v === "light" || v === "dark";

(function () {
  const root = document.documentElement;
  const trigger = document.getElementById("themeToggle");
  const menu = document.getElementById("themeMenu");
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");

  function apply(pref: Pref): void {
    root.setAttribute("data-theme-pref", pref);
    root.setAttribute("data-theme", pref === "system" ? (mq?.matches ? "dark" : "light") : pref);
    try {
      if (pref === "system") localStorage.removeItem("steer-theme");
      else localStorage.setItem("steer-theme", pref);
    } catch { /* private browsing: the choice just does not persist */ }
    const radio = document.getElementById("tm-" + pref);
    if (radio instanceof HTMLInputElement && !radio.checked) radio.checked = true;
        trigger?.setAttribute("aria-label", "Appearance: " + NAME[pref]);
  }

  const stored = root.getAttribute("data-theme-pref");
  apply(isPref(stored) ? stored : "system");

  // popover light-dismisses on an outside click but not on one inside itself
  function dismiss(): void {
    try { (menu as HTMLElement & { hidePopover?: () => void })?.hidePopover?.(); } catch { /* already closed */ }
    trigger?.focus();
  }

  /* Apply on `change`, dismiss on click or a confirm key, never the same event:
     arrows fire change, so dismissing there would shut the menu on the first
     press; and re-picking the selected mode fires no change at all, so
     dismissing only there would leave that click doing nothing. */
  document.querySelectorAll<HTMLInputElement>(".tm-in").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked && isPref(radio.value)) apply(radio.value);
    });
  });

  menu?.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(".tm-opt")) dismiss();
  });

  menu?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    // Space fires no change when the radio is already checked; Enter has no form
    // to submit. Without this neither key confirms.
    const focused = menu.querySelector<HTMLInputElement>(".tm-in:focus");
    if (focused && !focused.checked && isPref(focused.value)) {
      focused.checked = true;
      apply(focused.value);
    }
    e.preventDefault();
    dismiss();
  });

  // focus the current choice, so the group's arrow keys start somewhere
  menu?.addEventListener("toggle", (e) => {
    if ((e as ToggleEvent).newState !== "open") return;
    menu.querySelector<HTMLInputElement>(".tm-in:checked")?.focus();
  });

  /* Follow the OS until a side is forced. The pref check is what stops the OS
     clobbering a deliberate choice. */
  mq?.addEventListener("change", () => {
    if ((root.getAttribute("data-theme-pref") ?? "system") === "system") apply("system");
  });

  /* Test seam. The popover opens without this script (popovertarget is pure
     HTML), so tests could interact before the listeners existed. */
  root.setAttribute("data-theme-ready", "");
})();
