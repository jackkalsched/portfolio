console.log("IT’S ALIVE!");

// ---------- HELPER SELECTORS ----------
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
export function $(selector, context = document) {
  return context.querySelector(selector);
}

// ---------- BASE PATH FOR LINKS ----------
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

// ---------- PAGES NAV ----------
const pages = [
  { url: "index.html", title: "Home Page" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume/CV" },
  { url: "contact/", title: "Contact Me" },
  { url: "https://github.com/jackkalsched", title: "GitHub" },
];

const nav = document.createElement("nav");
document.body.prepend(nav);

for (const p of pages) {
  const url = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;
  const a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

// ---------- DARK MODE SWITCH ----------
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector(".color-scheme select");

if ("colorScheme" in localStorage) {
  document.documentElement.style.setProperty(
    "color-scheme",
    localStorage.colorScheme
  );
  select.value = localStorage.colorScheme;
} else {
  select.value = "light dark";
}

select.addEventListener("input", (event) => {
  const value = event.target.value;
  document.documentElement.style.setProperty("color-scheme", value);
  localStorage.colorScheme = value;
  console.log("Color scheme changed to", value);
});

// ---------- FETCH JSON ----------
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
    return [];
  }
}

// ---------- RENDER PROJECTS ----------
export function renderProjects(projects, containerElement, headingLevel = "h2") {
  if (!containerElement) {
    console.error("Invalid container element for renderProjects");
    return;
  }
  containerElement.innerHTML = "";

  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.innerHTML = "<p>No projects found.</p>";
    return;
  }

  for (const project of projects) {
    const article = document.createElement("article");
    article.innerHTML = `
      <${headingLevel}>${project.title ?? "Untitled Project"}</${headingLevel}>
      <img src="${project.image ?? ""}" alt="${project.title ?? ""}">
      <p>${project.description ?? ""}</p>
    `;
    containerElement.appendChild(article);
  }

  // optional project count at top of page
  const titleEl = document.querySelector(".projects-title");
  if (titleEl) {
    titleEl.textContent = `Projects (${projects.length})`;
  }
}

// ---------- GITHUB DATA ----------
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

