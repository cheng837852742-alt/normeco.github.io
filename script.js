const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-menu-toggle]");
const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ambientStops = [
  ["#080a0d", "#101821", "#06080b"],
  ["#090d12", "#16202a", "#08090c"],
  ["#0a0d10", "#1b2024", "#07080a"],
  ["#090b0e", "#121b22", "#07090d"],
  ["#080a0d", "#15181c", "#06080b"]
];

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 255, value & 255];
}

function mixColor(from, to, amount) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
  return `rgb(${mixed.join(", ")})`;
}

function setAmbientState() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
  const scaled = progress * (ambientStops.length - 1);
  const index = Math.min(Math.floor(scaled), ambientStops.length - 2);
  const amount = scaled - index;
  const current = ambientStops[index];
  const next = ambientStops[index + 1];

  root.style.setProperty("--scroll-progress", progress.toFixed(3));
  root.style.setProperty("--ambient-y-a", `${18 + progress * 32}%`);
  root.style.setProperty("--ambient-y-b", `${24 + progress * 24}%`);
  root.style.setProperty("--bg-top", mixColor(current[0], next[0], amount));
  root.style.setProperty("--bg-mid", mixColor(current[1], next[1], amount));
  root.style.setProperty("--bg-bottom", mixColor(current[2], next[2], amount));
}

let ticking = false;

function updateOnScroll() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    setHeaderState();
    if (!reduceMotion) setAmbientState();
    ticking = false;
  });
}

function prepareReveals() {
  const targets = document.querySelectorAll([
    ".hero-content > *",
    ".hero-metrics > div",
    ".section > *",
    ".product-card",
    ".product-card > div > *",
    ".process-list > div",
    ".partner-grid > div",
    ".culture-grid > article",
    ".keyword-list > span",
    ".contact-card > p"
  ].join(","));

  targets.forEach((target, index) => {
    target.classList.add("reveal-target");
    target.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 70}ms`);
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, {
    threshold: .16,
    rootMargin: "0px 0px -8% 0px"
  });

  targets.forEach((target) => observer.observe(target));
}

toggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  header.classList.toggle("is-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.tagName !== "A") return;
  nav.classList.remove("is-open");
  header.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
});

prepareReveals();
setHeaderState();
setAmbientState();
window.addEventListener("scroll", updateOnScroll, { passive: true });
window.addEventListener("resize", updateOnScroll);
