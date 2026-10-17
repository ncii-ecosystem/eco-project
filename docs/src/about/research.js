import { mountSystemChart } from "./modules/system-chart.js";
import { mountLawSection, stepsHtml } from "./modules/law.js";

const host = document.getElementById("research-visual");
const title = document.getElementById("research-detail-title");
const body = document.getElementById("research-detail-body");

const Eco = {
  replaying: true,
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
    const right = Math.max(...bounds.map((box) => box.x + box.width));
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
  function setView(view) {
    host.closest(".about-research").dataset.view = view;
    policy.reset();
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
      title.hidden = false;
      title.textContent = "The technology ecosystem";
      const paragraph = document.createElement("p");
      paragraph.textContent =
        "Select a box to learn how that technology helps create, spread, or support image-based abuse. The connecting arrows show how it relates to other parts of the ecosystem.";
      body.replaceChildren(paragraph);
    }
  }
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
  document.fonts.ready.then(scheduleChartFit);
} catch (error) {
  document.getElementById("research-error").hidden = false;
  console.error("Research explorer failed to initialize", error);
}
