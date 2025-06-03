function loadPage(page) {
    document.getElementById('maincontent').src = page;
}

function navClick(navId, pageName) {
    document.querySelectorAll('.topnav a').forEach(link => {link.classList.remove('active');});
    document.getElementById(navId).classList.add('active');
    loadPage(pageName);
}

document.addEventListener('DOMContentLoaded', function() {navClick('homeLink', 'page-home.html');});
