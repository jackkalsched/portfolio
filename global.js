console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/website/";         // GitHub Pages repo name


  if (currentLink) {
    currentLink?.classList.add('current');
  }

const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact Me' },
    { url: 'https://github.com/jackkalsched', title: 'GitHub' }
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (const p of pages) {
    let url = p.url;
    url = !url.startsWith('http') ? BASE_PATH + url : url;
    nav.insertAdjacentHTML('beforeend', `<a href="${url}">${p.title}</a>`);
  }

const navLinks = $$("nav a");

const currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );
  
  // Add the "current" class if found
  currentLink?.classList.add("current");