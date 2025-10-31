import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function initProjectsPage() {
  const projects = await fetchJSON("../lib/projects.json");
  const container = document.querySelector(".projects");

  renderProjects(projects, container, "h2");
}

let legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`) 
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); 
});

initProjectsPage();