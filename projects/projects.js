import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function initProjectsPage() {
  // Step 1: Render the projects grid
  const projects = await fetchJSON("../lib/projects.json");
  const container = document.querySelector(".projects");
  renderProjects(projects, container, "h2");

  // Step 2: Build pie chart and legend
  const svg = d3.select("#projects-pie-plot");

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

  const data = [
    { value: 1, label: "apples" },
    { value: 2, label: "oranges" },
    { value: 3, label: "mangos" },
    { value: 4, label: "pears" },
    { value: 5, label: "limes" },
    { value: 5, label: "cherries" },
  ];

  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Draw arcs
  arcData.forEach((d, idx) => {
    svg.append("path")
      .attr("d", arcGenerator(d))
      .attr("fill", colors(idx))
      .attr("stroke", "white")
      .attr("stroke-width", 1);
  });

  // Build legend (per your instructions)
  const legend = d3.select(".legend");
  data.forEach((d, idx) => {
    legend
      .append("li")
      .attr("style", `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

initProjectsPage();
;