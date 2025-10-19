cconsole.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/" 
  : "/portfolio/"; 

let pages = [
  { url: 'index.html', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume/CV' },
  { url: 'https://github.com/jackkalsched', title: 'GitHub' }
];

  let nav = document.createElement('nav');
  document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith('http')) {
  url = BASE_PATH + url;
    }
    let a = document.createElement('a');
a.href = url;
a.textContent = title;
if (a.host === location.host && a.pathname === location.pathname) {
  a.classList.add('current');
}
 if (a.host !== location.host) {
    a.target = "_blank";
  }
nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark" selected>Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const themeLabel = document.querySelector('.color-scheme');
themeLabel.style.position = 'absolute';
themeLabel.style.top = '1rem';
themeLabel.style.right = '1rem';
themeLabel.style.fontSize = '0.8em';
themeLabel.style.fontFamily = 'inherit';

const select = document.querySelector('.color-scheme select');

if ("colorScheme" in localStorage) {
  const saved = localStorage.colorScheme;
  document.documentElement.style.setProperty('color-scheme', saved);
  select.value = saved;
}

select.addEventListener('input', function(event) {
  const value = event.target.value;
  console.log('color scheme changed to', value);
  document.documentElement.style.setProperty('color-scheme', value);
  localStorage.colorScheme = value;
});