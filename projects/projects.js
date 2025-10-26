import { fetchJSON, renderProjects } from "../global.js";

async function initProjectsPage() {
  const projects = await fetchJSON("../lib/projects.json");
  const container = document.querySelector(".projects");

  renderProjects(projects, container, "h2");
}

initProjectsPage();