import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

window.addEventListener("DOMContentLoaded", async () => {
  try {
    // --- Load and render all projects on the page ---
    const projects = await fetchJSON("../lib/projects.json");
    const container = document.querySelector(".projects");
    renderProjects(projects, container, "h2");

    // ✅ Check that we actually have project data
    console.log("Loaded projects:", projects);

    // --- STEP 3.1: Aggregate projects per year using d3.rollups ---
    const rolledData = d3.rollups(
      projects,
      (v) => v.length,   // count of projects per year
      (d) => d.year      // key = year
    );

    // Convert rollup format → array of { label, value } objects
    const data = rolledData.map(([year, count]) => ({
      label: year,
      value: count,
    }));

    console.log("Aggregated data for pie chart:", data);

    // --- D3 PIE SETUP ---
    const svg = d3.select("#projects-pie-plot");
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    const sliceGenerator = d3.pie().value((d) => d.value);
    const arcData = sliceGenerator(data);
    const colors = d3.scaleOrdinal(d3.schemeTableau10);

    // --- Draw pie chart ---
    svg.selectAll("path")
      .data(arcData)
      .join("path")
      .attr("d", arcGenerator)
      .attr("fill", (_, i) => colors(i))
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    // --- Build legend dynamically from data ---
    const legend = d3.select(".legend");
    legend.selectAll("li")
      .data(data)
      .join("li")
      .attr("class", "legend-item")
      .attr("style", (_, i) => `--color:${colors(i)}`)
      .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);

    renderChart(projects);

    let query = "";
    const searchInput = document.querySelector(".searchBar");

    searchInput.addEventListener("input", (event) => {
      query = event.target.value.toLowerCase();

      const filteredProjects = projects.filter((project) =>
        project.title.toLowerCase().includes(query)
      );

      renderProjects(filteredProjects, container, "h2");
      renderChart(filteredProjects);
    });

  } catch (err) {
    console.error("Error initializing projects page:", err);
  }
});
