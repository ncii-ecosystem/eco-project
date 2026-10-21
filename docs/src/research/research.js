import { mountSystemChart } from "./modules/system-chart.js?v=10";
import { mountLawSection, stepsHtml } from "./modules/law.js?v=15";

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
  const legendGroup = graph.ext.svg.querySelector(".eg-legend");
  const legendSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  legendSvg.classList.add("research-system-legend");
  legendSvg.setAttribute("aria-label", "Technology roles");
  legendSvg.appendChild(legendGroup);
  host.insertBefore(legendSvg, graph.ext.root);
  legendGroup.querySelectorAll(".eg-legend-item").forEach((item, index) => {
    const rowY = index * 24;
    const swatch = item.querySelector(".eg-swatch");
    Object.entries({ x: 0.5, y: rowY + 0.5, width: 15, height: 15 })
      .forEach(([name, value]) => swatch.setAttribute(name, value));
    const label = item.querySelector(".eg-legend-label");
    label.setAttribute("x", 22);
    label.setAttribute("y", rowY + 8);
    label.setAttribute("dominant-baseline", "central");
    const hit = item.querySelector(".eg-legend-hit");
    Object.entries({ x: 0, y: rowY, width: 240, height: 24 })
      .forEach(([name, value]) => hit.setAttribute(name, value));
  });
  const legendHint = document.createElementNS("http://www.w3.org/2000/svg", "text");
  legendHint.setAttribute("class", "eg-legend-hint");
  legendHint.setAttribute("x", 0);
  legendHint.setAttribute("y", 5 * 24 + 18);
  legendHint.textContent = "Click a role to highlight it";
  legendGroup.appendChild(legendHint);
  const originalNodeText = new Map(
    [...graph.ext.svg.querySelectorAll(".eg-title, .eg-icon")].map((text) =>
      [text, { content: text.innerHTML, y: text.getAttribute("y"), style: text.getAttribute("style") }],
    ),
  );
  function fitChart() {
    const compact = window.matchMedia("(max-width: 999px)").matches;
    originalNodeText.forEach((original, text) => {
      text.innerHTML = original.content;
      text.setAttribute("y", original.y);
      text.setAttribute("style", original.style);
    });
    if (compact) {
      graph.ext.NODES.forEach((node, index) => {
        const element = graph.ext.nodeEls[index];
        const label = element.querySelector(".eg-title");
        const icon = element.querySelector(".eg-icon");
        label.style.fontSize = "32px";
        icon.style.fontSize = "44px";
        if (!node.tall) return;
        const words = label.textContent.split(" ");
        const lines = [];
        let line = "";
        for (const word of words) {
          label.textContent = line ? `${line} ${word}` : word;
          if (line && label.getComputedTextLength() > node.w - 24) {
            lines.push(line);
            line = word;
          } else line = label.textContent;
        }
        lines.push(line);
        const center = node.y + node.h / 2;
        icon.setAttribute("y", center - lines.length * 20);
        label.replaceChildren(...lines.map((content, index) => {
          const span = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
          span.setAttribute("x", node.x + node.w / 2);
          span.setAttribute("y", center + 34 + index * 38 - lines.length * 12);
          span.textContent = content;
          return span;
        }));
      });
    }
    graph.centerWideContent();
    if (compact) {
      graph.ext.NODES.forEach((node, index) => {
        const element = graph.ext.nodeEls[index];
        const texts = [...element.querySelectorAll(".eg-title, .eg-icon")];
        const bounds = texts.map((text) => text.getBBox());
        const top = Math.min(...bounds.map((box) => box.y));
        const bottom = Math.max(...bounds.map((box) => box.y + box.height));
        const offset = node.y + node.h / 2 - (top + bottom) / 2;
        texts.forEach((text) => {
          const rows = text.querySelectorAll("tspan");
          (rows.length ? [...rows] : [text]).forEach((row) =>
            row.setAttribute("y", Number(row.getAttribute("y")) + offset),
          );
        });
      });
    }
    const { svg, NODES } = graph.ext;
    const left = Math.min(...NODES.map((node) => node.x));
    const top = Math.min(...NODES.map((node) => node.y));
    const scale = window.matchMedia("(min-width: 901px)").matches ? 0.92 : 1;
    const diagramOffset = 40;
    svg.querySelectorAll(".eg-nodes, .eg-edges").forEach((group) =>
      group.setAttribute("transform", `translate(${left * (1 - scale)} ${top * (1 - scale) + diagramOffset}) scale(${scale})`),
    );
    const right = left + (Math.max(...NODES.map((node) => node.x + node.w)) - left) * scale;
    const bottom = top + (Math.max(...NODES.map((node) => node.y + node.h)) - top) * scale + diagramOffset;
    svg.setAttribute("viewBox", `${left} ${top} ${right - left} ${bottom - top}`);
  }
  function showSystemDefault() {
    title.hidden = true;
    title.textContent = "The technology ecosystem";
    const paragraph = document.createElement("p");
    paragraph.textContent =
      "Select a box to learn how that technology helps create, spread, or support image-based abuse. The connecting arrows show how it relates to other parts of the ecosystem.";
    body.replaceChildren(paragraph);
  }
  // Restore the current view’s default note when its selection is cleared.
  Eco.resetNote = () => {
    if (host.closest(".about-research").dataset.view === "law") Eco.showNote(topics.find((step) => step.dataset.fin === "law-map"));
    else showSystemDefault();
  };
  function setView(view) {
    document.querySelector(".research-diagram-title").textContent = view === "law"
      ? "Landscape of U.S. State Laws Regulating the AIG-NCII Ecosystem"
      : "Role of Technology in Facilitating AIG-NCII";
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
  const wideScreen = window.matchMedia("(min-width: 1000px)");
  let fitFrame = null;
  // Measure the active caption at the proposed figure width.
  function descNaturalHeight(width) {
    let tallest = 0;
    document.querySelectorAll(".research-desc").forEach((el) => {
      if (el.dataset.for !== host.closest(".about-research").dataset.view) return;
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
    ["--figure-w", "--desc-h", "--content-w"].forEach((name) => page.style.removeProperty(name));
    if (!wideScreen.matches) return;
    const style = getComputedStyle(page);
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const available = window.innerHeight - (page.getBoundingClientRect().top + window.scrollY) - pad;
    const noteW = 17 * 16 + 12;                 // the note card and the gap beside the figure window
    const columnW = Math.floor(figureRow.getBoundingClientRect().width);
    // The figure window and its note fill the whole right-hand column, from top to bottom.
    const figureW = Math.max(480, columnW - noteW);
    // Reserve space for the title, caption, and figure padding.
    const descH = Math.min(15 * 16, Math.max(0, Math.ceil(descNaturalHeight(figureW - 26)) + 2));
    const maxW = Math.max(300, figureW - 26);
    const titleH = document.querySelector(".research-diagram-title").getBoundingClientRect().height;
    const maxH = available - descH - titleH - 38;        // borders, padding and the space around the box
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
    scheduleChartFit();
  }
  let settleTimer = null;
  function scheduleFigureFit() {
    if (fitFrame === null) fitFrame = requestAnimationFrame(fitFigureToWindow);
    // Recheck once the layout has settled.
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
  // Keep SVG sizing in sync with the figure container.
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
