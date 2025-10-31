import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

window.addEventListener("DOMContentLoaded", async () => {
  try {
    // --- Load project data ---
    const projects = await fetchJSON("../lib/projects.json");
    const projectsContainer = document.querySelector(".projects");
    const searchInput = document.querySelector(".searchBar");

    // --- Render all projects initially ---
    renderProjects(projects, projectsContainer, "h2");

    // ✅ Step 4.4: Refactor D3 plotting into a reusable function
    function renderPieChart(projectsGiven) {
      // Clear previous paths and legend items
      const svg = d3.select("#projects-pie-plot");
      svg.selectAll("path").remove();

      const legend = d3.select(".legend");
      legend.selectAll("li").remove();

      // Re-calculate grouped data
      const rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
      );

      const data = rolledData.map(([year, count]) => ({
        label: year,
        value: count,
      }));

      // If no data (e.g. empty search), stop early
      if (data.length === 0) return;

      // Re-generate pie chart + colors
      const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
      const sliceGenerator = d3.pie().value((d) => d.value);
      const arcData = sliceGenerator(data);
      const colors = d3.scaleOrdinal(d3.schemeTableau10);

      // Draw pie slices
      svg
        .selectAll("path")
        .data(arcData)
        .join("path")
        .attr("d", arcGenerator)
        .attr("fill", (_, i) => colors(i))
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      // Draw legend
      legend
        .selectAll("li")
        .data(data)
        .join("li")
        .attr("class", "legend-item")
        .attr("style", (_, i) => `--color:${colors(i)}`)
        .html(
          (d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`
        );
    }

    // ✅ Initial render when the page loads
    renderPieChart(projects);

    // --- Step 4.2 + 4.4: Reactive search handling ---
    let query = "";

    searchInput.addEventListener("input", (event) => {
      query = event.target.value.toLowerCase();

      // Filter projects by title
      const filteredProjects = projects.filter((p) =>
        p.title.toLowerCase().includes(query)
      );

      // Update displayed project grid + reactive pie chart
      renderProjects(filteredProjects, projectsContainer, "h2");
      renderPieChart(filteredProjects);
    });
  } catch (err) {
    console.error("Error initializing projects page:", err);
  }
});
