// projects.js
import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function initProjectsPage() {
  try {
    // Render project grid
    const projects = await fetchJSON("../lib/projects.json");
    const container = document.querySelector(".projects");
    renderProjects(projects, container, "h2");

    // --- D3 PIE CHART + LEGEND --- //
    const svg = d3.select("#projects-pie-plot");

    const data = [
      { value: 1, label: "apples" },
      { value: 2, label: "oranges" },
      { value: 3, label: "mangos" },
      { value: 4, label: "pears" },
      { value: 5, label: "limes" },
      { value: 6, label: "cherries" },
    ];

    const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    const sliceGenerator = d3.pie().value((d) => d.value);
    const arcData = sliceGenerator(data);
    const colors = d3.scaleOrdinal(d3.schemeTableau10);

    // Draw pie slices
    svg.selectAll("path")
      .data(arcData)
      .join("path")
      .attr("d", arcGenerator)
      .attr("fill", (_, i) => colors(i))
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    // Build legend
    let legend = d3.select(".legend");
    data.forEach((d, idx) => {
      legend.selectAll("li")
        .data(data)
        .append("li")
        .attr("style", (_, i) => `--color:${colors(i)}`)
        .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    })

  } catch (err) {
    console.error("Error initializing projects page:", err);
  }
}

document.addEventListener("DOMContentLoaded", initProjectsPage);
;