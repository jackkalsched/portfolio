console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// ---------- BASE PATH FOR LINKS ----------
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/"; 

// ---------- PAGES NAV ----------
let pages = [
  { url: "index.html", title: "Home Page" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume/CV" },
  { url: "contact/", title: "Contact Me" },
  { url: "https://github.com/jackkalsched", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;
  let a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  // Highlight current page
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  // Open external links in a new tab
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

// ---------- LOAD SAVED PREFERENCE ----------
if ("colorScheme" in localStorage) {
  document.documentElement.style.setProperty(
    "color-scheme",
    localStorage.colorScheme
  );
  select.value = localStorage.colorScheme;
} else {
  select.value = "light dark"; // default automatic
}

// ---------- HANDLE USER CHANGES ----------
select.addEventListener("input", (event) => {
  const value = event.target.value;
  document.documentElement.style.setProperty("color-scheme", value);
  localStorage.colorScheme = value;
  console.log("Color scheme changed to", value);
});
