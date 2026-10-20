import { mountSystemChart } from "./modules/system-chart.js";
import { mountLawSection, stepsHtml } from "./modules/law.js";

const host = document.getElementById("research-visual");
const title = document.getElementById("research-detail-title");
const body = document.getElementById("research-detail-body");

const Eco = {
  replaying: true,
  richNotes: true,
  onActivate(element, handler) {
    element.addEventListener("click", handler);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler(event);
      }
    });
  },
  showNote(step) {
    title.hidden = step.dataset.fin === "law-map";
    title.textContent = step.querySelector(".step-label").textContent;
    const content = [
      step.querySelector(".step-key-text"),
      ...step.querySelectorAll(".step-detail > *"),
    ];
    body.replaceChildren(
      ...content.filter(Boolean).map((node) => node.cloneNode(true)),
    );
  },
};

try {
  const graph = mountSystemChart({ Eco, mon: host });
  const policy = mountLawSection({
    Eco,
    mon: host,
    motionScope: {
      setTimeout(callback) {
        callback();
        return 0;
      },
      clearTimeout() {},
      requestAnimationFrame(callback) {
        callback();
        return 0;
      },
    },
  });
  const fragments = new DOMParser().parseFromString(stepsHtml, "text/html");
  const topics = [...fragments.querySelectorAll(".step[data-fin]")];

  const viewButtons = [...document.querySelectorAll("[data-view]")];
  function fitChart() {
    graph.centerWideContent();
    const { svg, NODES } = graph.ext;
    const legendGroup = svg.querySelector(".eg-legend");
    const legend = legendGroup.getBBox();
    if (!legend.width) return;
    const left = Math.min(...NODES.map((node) => node.x));
    const top = Math.min(...NODES.map((node) => node.y));
    const scale = window.matchMedia("(min-width: 901px)").matches ? 0.92 : 1;
    const transform = `translate(${left * (1 - scale)} ${top * (1 - scale)}) scale(${scale})`;
    svg
      .querySelectorAll(".eg-nodes, .eg-edges")
      .forEach((group) => group.setAttribute("transform", transform));
    legendGroup.setAttribute("transform", `translate(${left - legend.x} 0)`);
    const bounds = [
      ...NODES.map((node) => ({
        x: node.x,
        y: node.y,
        width: node.w,
        height: node.h,
      })),
      { x: left, y: legend.y, width: legend.width, height: legend.height },
    ];
    const x = Math.min(...bounds.map((box) => box.x));
    const y = Math.min(...bounds.map((box) => box.y));
    // The boxes are scaled toward their top-left corner, so measure the frame to the scaled drawing (keeps it centered).
    const boxesRight = left + (Math.max(...NODES.map((node) => node.x + node.w)) - left) * scale;
    const right = Math.max(boxesRight, left + legend.width);
    const bottom = Math.max(
      top + (Math.max(...NODES.map((node) => node.y + node.h)) - top) * scale,
      legend.y + legend.height,
    );
    svg.setAttribute("viewBox", `${x} ${y} ${right - x} ${bottom - y}`);
    const svgScale = svg.getBoundingClientRect().width / (right - x);
    if (svgScale > 0) {
      const markerSize =
        (parseFloat(
          getComputedStyle(host).getPropertyValue(
            "--research-legend-marker-size",
          ),
        ) -
          1) /
        svgScale;
      legendGroup.querySelectorAll(".eg-swatch").forEach((swatch, index) => {
        swatch.setAttribute("width", markerSize);
        swatch.setAttribute("height", markerSize);
        swatch.setAttribute("y", 92 + index * 39 - markerSize / 2);
      });
    }
  }
  function showSystemDefault() {
    title.hidden = true;
    title.textContent = "The technology ecosystem";
    const paragraph = document.createElement("p");
    paragraph.textContent =
      "Select a box to learn how that technology helps create, spread, or support image-based abuse. The connecting arrows show how it relates to other parts of the ecosystem.";
    body.replaceChildren(paragraph);
  }
  // Puts the note card back to its starting message for the view that is showing (used when a legend choice is cleared).
  Eco.resetNote = () => {
    if (host.closest(".about-research").dataset.view === "law") Eco.showNote(topics.find((step) => step.dataset.fin === "law-map"));
    else showSystemDefault();
  };
  function setView(view) {
    host.closest(".about-research").dataset.view = view;
    policy.reset();
    graph.clearRole();
    graph.select(null);
    graph.setProgress(1);
    viewButtons.forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.view === view)),
    );
    if (view === "law") {
      policy.step("law-map");
      Eco.showNote(topics.find((step) => step.dataset.fin === "law-map"));
    } else {
      fitChart();
      showSystemDefault();
    }
    scheduleFigureFit();
  }
  /* Wide screens: size the figure so the whole page fits in the window without scrolling. */
  const figureRow = document.querySelector(".research-layout");
  const visualBox = host.closest(".research-visual-scroll");
  const wideScreen = window.matchMedia("(min-width: 1000px)");
  let fitFrame = null;
  // Natural height of the caption + Description box at a given width, for whichever view is hidden too.
  function descNaturalHeight(width) {
    let tallest = 0;
    document.querySelectorAll(".research-desc").forEach((el) => {
      const saved = el.getAttribute("style");
      el.style.cssText += `;display:block;position:absolute;visibility:hidden;height:auto;overflow:visible;width:${width}px`;
      tallest = Math.max(tallest, el.getBoundingClientRect().height);
      if (saved === null) el.removeAttribute("style");
      else el.setAttribute("style", saved);
    });
    return Math.ceil(tallest);
  }
  // Height of the system chart and of the law map at a given width (the hidden one is measured off-screen too).
  function tallestContent(width) {
    let tallest = 0;
    [[".eco-graph", "block"], [".pol-map", "grid"]].forEach(([selector, display]) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const saved = el.getAttribute("style");
      el.style.cssText += `;display:${display};position:absolute;visibility:hidden;inset:auto;width:${width}px;max-width:none`;
      tallest = Math.max(tallest, el.getBoundingClientRect().height);
      if (saved === null) el.removeAttribute("style");
      else el.setAttribute("style", saved);
    });
    return tallest;
  }
  function fitFigureToWindow() {
    fitFrame = null;
    const page = document.querySelector(".about-layout");
    ["--figure-w", "--desc-h", "--content-w", "--shared-fs"].forEach((name) => page.style.removeProperty(name));
    if (!wideScreen.matches) return;
    const style = getComputedStyle(page);
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const available = window.innerHeight - (page.getBoundingClientRect().top + window.scrollY) - pad;
    const noteW = 17 * 16 + 14;                 // the note card and the gap beside the figure window
    const columnW = Math.floor(figureRow.getBoundingClientRect().width);
    // The figure window and its note fill the whole right-hand column, from top to bottom.
    const figureW = Math.max(480, columnW - noteW);
    // Inside the window: the chart or map on top, the caption + Description box along the bottom.
    const descH = Math.min(15 * 16, Math.max(5 * 16, Math.ceil(descNaturalHeight(figureW - 26)) + 2));
    const maxW = Math.max(300, figureW - 26);
    const maxH = available - descH - 38;        // borders, padding and the space around the box
    if (maxH <= 100) return;
    let contentW = maxW;
    for (let pass = 0; pass < 4; pass++) {
      const h = tallestContent(contentW);
      if (!h) break;
      const next = Math.max(300, Math.min(maxW, Math.floor((contentW * maxH) / h)));
      if (Math.abs(next - contentW) < 2) { contentW = Math.min(contentW, next); break; }
      contentW = next;
    }
    page.style.setProperty("--figure-w", figureW + "px");
    page.style.setProperty("--desc-h", descH + "px");
    page.style.setProperty("--content-w", contentW + "px");
    // The text box on the left uses the largest size (15px down to 12px) that fits without scrolling.
    const shared = document.querySelector(".research-copy");
    let size = 15;
    page.style.setProperty("--shared-fs", size + "px");
    while (shared.scrollHeight > shared.clientHeight + 1 && size > 12) {
      size -= 0.25;
      page.style.setProperty("--shared-fs", size + "px");
    }
    scheduleChartFit();
  }
  let settleTimer = null;
  function scheduleFigureFit() {
    if (fitFrame === null) fitFrame = requestAnimationFrame(fitFigureToWindow);
    // measure again once the column animation has finished
    clearTimeout(settleTimer);
    settleTimer = setTimeout(fitFigureToWindow, 500);
  }
  window.addEventListener("resize", scheduleFigureFit);

  viewButtons.forEach((button) =>
    button.addEventListener("click", () => setView(button.dataset.view)),
  );
  setView("system");
  let chartFrame = null;
  function scheduleChartFit() {
    if (chartFrame !== null) return;
    chartFrame = requestAnimationFrame(() => {
      chartFrame = null;
      if (host.closest(".about-research").dataset.view === "system") fitChart();
    });
  }
  window.addEventListener("resize", scheduleChartFit);
  // the figure column resizes when the abstract or citation is opened
  if (window.ResizeObserver) new ResizeObserver(scheduleChartFit).observe(host);
  document.fonts.ready.then(scheduleChartFit);
  document.fonts.ready.then(scheduleFigureFit);
} catch (error) {
  document.getElementById("research-error").hidden = false;
  console.error("Research explorer failed to initialize", error);
}

// Clicking the dark area around a popup closes it.
document.querySelectorAll(".about-dialog").forEach((dialog) =>
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && window.SiteDialogs) window.SiteDialogs.close(dialog);
  }),
);
