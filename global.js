console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const navLinks = $$("nav a");


const currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );

  if (currentLink) {
    currentLink?.classList.add('current');
  }

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact Me' },
    { url: 'https://github.com/jackkalsched', title: 'GitHub' }
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    nav.insertAdjacentHTML('beforeend', `<a href="${url}">${title}</a>`);
  }