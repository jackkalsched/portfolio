import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const projects = await fetchJSON("../lib/projects.json");
    const projectsContainer = document.querySelector(".projects");
    const searchInput = document.querySelector(".searchBar");

    renderProjects(projects, projectsContainer, "h2");

    // --- Step 5.2: track selected wedge ---
    let selectedIndex = -1;

    function renderPieChart(projectsGiven) {
      const svg = d3.select("#projects-pie-plot");
      const legend = d3.select(".legend");

      // Clear existing chart & legend
      svg.selectAll("path").remove();
      legend.selectAll("li").remove();

      // Recalculate grouped data
      const rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
      );
      const data = rolledData.map(([year, count]) => ({
        label: year,
        value: count,
      }));

      if (data.length === 0) return;

      const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
      const sliceGenerator = d3.pie().value((d) => d.value);
      const arcData = sliceGenerator(data);
      const colors = d3.scaleOrdinal(d3.schemeTableau10);

      // --- Draw wedges ---
      const paths = svg
        .selectAll("path")
        .data(arcData)
        .join("path")
        .attr("d", arcGenerator)
        .attr("fill", (_, i) => colors(i))
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .on("click", (_, d, i) => {
          // D3 v7 passes (_, eventIndex) differently; handle safely
          const idx = arcData.indexOf(d);
          selectedIndex = selectedIndex === idx ? -1 : idx;

          // Update selection classes
          svg.selectAll("path").attr("class", (_, j) =>
            j === selectedIndex ? "selected" : null
          );
          legend.selectAll("li").attr("class", (_, j) =>
            j === selectedIndex ? "legend-item selected" : "legend-item"
          );

          // --- Bonus: filter visible projects when selecting a wedge ---
          const yearSelected =
            selectedIndex === -1 ? null : data[selectedIndex].label;
          const filtered =
            yearSelected === null
              ? projects
              : projects.filter((p) => p.year === yearSelected);
          renderProjects(filtered, projectsContainer, "h2");
        });

      // --- Draw legend ---
      legend
        .selectAll("li")
        .data(data)
        .join("li")
        .attr("class", "legend-item")
        .attr("style", (_, i) => `--color:${colors(i)}`)
        .html(
          (d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`
        )
        .on("click", (_, d, i) => {
          const idx = data.indexOf(d);
          selectedIndex = selectedIndex === idx ? -1 : idx;

          svg.selectAll("path").attr("class", (_, j) =>
            j === selectedIndex ? "selected" : null
          );
          legend.selectAll("li").attr("class", (_, j) =>
            j === selectedIndex ? "legend-item selected" : "legend-item"
          );

          const yearSelected =
            selectedIndex === -1 ? null : data[selectedIndex].label;
          const filtered =
            yearSelected === null
              ? projects
              : projects.filter((p) => p.year === yearSelected);
          renderProjects(filtered, projectsContainer, "h2");
        });
    }

    // Initial chart render
    renderPieChart(projects);

    // --- Reactive search filtering (Step 4.4) ---
    searchInput.addEventListener("input", (event) => {
      const query = event.target.value.toLowerCase();
      const filteredProjects = projects.filter((p) =>
        p.title.toLowerCase().includes(query)
      );

      renderProjects(filteredProjects, projectsContainer, "h2");
      renderPieChart(filteredProjects);
    });
  } catch (err) {
    console.error("Error initializing projects page:", err);
  }
});
