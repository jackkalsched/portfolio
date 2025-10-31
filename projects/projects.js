import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const projects = await fetchJSON("../lib/projects.json");
    const projectsContainer = document.querySelector(".projects");
    const searchInput = document.querySelector(".searchBar");

    renderProjects(projects, projectsContainer, "h2");

    let selectedIndex = -1;
    let query = ""; // ✅ Step 5.4 prep: track search term globally

    // --- Step 5.3: Helper function to combine filters ---
    function getFilteredProjects() {
      // Start from all projects
      let filtered = projects;

      // Filter by search
      if (query) {
        filtered = filtered.filter((p) =>
          p.title.toLowerCase().includes(query)
        );
      }

      // Filter by selected wedge (year)
      if (selectedIndex !== -1 && currentData[selectedIndex]) {
        const yearSelected = currentData[selectedIndex].label;
        filtered = filtered.filter((p) => p.year === yearSelected);
      }

      return filtered;
    }

    let currentData = []; // Store latest pie data for reference

    function renderPieChart(projectsGiven) {
      const svg = d3.select("#projects-pie-plot");
      const legend = d3.select(".legend");

      svg.selectAll("path").remove();
      legend.selectAll("li").remove();

      const rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
      );
      const data = rolledData.map(([year, count]) => ({
        label: year,
        value: count,
      }));
      currentData = data; // ✅ track for later use in filter logic

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
        .attr("class", (_, i) => (i === selectedIndex ? "selected" : null))
        .on("click", (_, d) => {
          const idx = arcData.indexOf(d);
          selectedIndex = selectedIndex === idx ? -1 : idx;

          // ✅ Update visuals
          svg.selectAll("path").attr("class", (_, j) =>
            j === selectedIndex ? "selected" : null
          );
          legend.selectAll("li").attr("class", (_, j) =>
            j === selectedIndex ? "legend-item selected" : "legend-item"
          );

          // ✅ Apply filters and re-render projects based on search + year
          const filtered = getFilteredProjects();
          renderProjects(filtered, projectsContainer, "h2");
        });

      // --- Draw legend ---
      legend
        .selectAll("li")
        .data(data)
        .join("li")
        .attr("class", (d, i) =>
          i === selectedIndex ? "legend-item selected" : "legend-item"
        )
        .attr("style", (_, i) => `--color:${colors(i)}`)
        .html(
          (d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`
        )
        .on("click", (_, d) => {
          const idx = data.indexOf(d);
          selectedIndex = selectedIndex === idx ? -1 : idx;

          svg.selectAll("path").attr("class", (_, j) =>
            j === selectedIndex ? "selected" : null
          );
          legend.selectAll("li").attr("class", (_, j) =>
            j === selectedIndex ? "legend-item selected" : "legend-item"
          );

          const filtered = getFilteredProjects();
          renderProjects(filtered, projectsContainer, "h2");
        });
    }

    // ✅ Initial render
    renderPieChart(projects);

    // --- Step 5.4: Combined reactive search ---
    searchInput.addEventListener("input", (event) => {
      query = event.target.value.toLowerCase();

      // Always filter both search + wedge
      const filteredProjects = getFilteredProjects();

      renderProjects(filteredProjects, projectsContainer, "h2");
      renderPieChart(filteredProjects);
    });
  } catch (err) {
    console.error("Error initializing projects page:", err);
  }
});
