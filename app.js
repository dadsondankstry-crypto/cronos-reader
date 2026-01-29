// SUBSTITUA PELO SEU LINK DO CLOUDFLARE WORKER
const PROXY = "https://fragrant-unit-a421.dadsondankstry.workers.dev/?url=";

const API_URL_DEX = "https://api.mangadex.org";
const API_URL_JIKAN = "https://api.jikan.moe/v4";
const API_URL_KITSU = "https://kitsu.io/api/edge";

const viewer = document.getElementById('viewer');
const onlineResults = document.getElementById('online-results');
const libraryView = document.getElementById('library-view');

let favorites = JSON.parse(localStorage.getItem('cronos_favs')) || [];
let history = JSON.parse(localStorage.getItem('cronos_history')) || [];
let currentMangaChapters = [];
let currentIndex = -1;

window.onload = renderHome;

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

function renderHome() {
    libraryView.innerHTML = "";
    if (history.length > 0) {
        libraryView.innerHTML += '<p style="padding:10px; color:var(--primary); font-weight:bold;">HISTÓRICO RECENTE</p>';
        const g = createGrid();
        history.forEach(h => g.appendChild(createMangaCard(h.title, h.cover)));
        libraryView.appendChild(g);
    }
    if (favorites.length > 0) {
        libraryView.innerHTML += '<p style="padding:10px; color:var(--primary); font-weight:bold;">MEUS FAVORITOS</p>';
        const g = createGrid();
        favorites.forEach(f => g.appendChild(createMangaCard(f.title, f.cover)));
        libraryView.appendChild(g);
    }
}

function createGrid() { const g = document.createElement('div'); g.className = "grid-layout"; return g; }

function createMangaCard(title, cover) {
    const card = document.createElement('div');
    card.className = 'manga-card';
    card.innerHTML = `
        <img src="${cover || 'https://via.placeholder.com/150x225?text=Cronos'}" onclick="startSearchFlow('${title.replace(/'/g, "\\'")}')">
        <p>${title}</p>`;
    return card;
}

function startSearchFlow(title) {
    if (document.getElementById('use-scraper').checked) {
        searchMangaHostDirect(title);
    } else {
        findOnMangaDex(title);
    }
}

let debounceTimer;
function searchMangaDebounced(q) {
    clearTimeout(debounceTimer);
    if (q.length < 3) { onlineResults.innerHTML = ""; libraryView.style.display = "block"; return; }
    debounceTimer = setTimeout(async () => {
        libraryView.style.display = "none";
        onlineResults.innerHTML = "<p style='text-align:center; padding:20px;'>Consultando fontes...</p>";
        const useJikan = document.getElementById('use-jikan').checked;
        const useKitsu = document.getElementById('use-kitsu').checked;
        const useScraper = document.getElementById('use-scraper').checked;

        onlineResults.innerHTML = "";
        if (useJikan) await fetchJikan(q);
        if (useKitsu) await fetchKitsu(q);
        if (useScraper) await fetchMangaHost(q);
    }, 600);
}

async function fetchJikan(q) {
    try {
        const res = await fetch(`${API_URL_JIKAN}/manga?q=${q}&limit=6`);
        const data = await res.json();
        data.data.forEach(m => onlineResults.appendChild(createMangaCard(m.title, m.images.jpg.image_url)));
    } catch (e) { console.error(e); }
}

async function fetchKitsu(q) {
    try {
        const res = await fetch(`${API_URL_KITSU}/manga?filter[text]=${q}&page[limit]=5`);
        const data = await res.json();
        data.data.forEach(m => onlineResults.appendChild(createMangaCard(m.attributes.canonicalTitle, m.attributes.posterImage.small)));
    } catch (e) { console.error(e); }
}

async function fetchMangaHost(q) {
    try {
        const res = await fetch(PROXY + `https://mangahosted.com/find/${encodeURIComponent(q)}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const links = doc.querySelectorAll(".entry-title a, .table-search a");
        links.forEach(l => {
            const card = createMangaCard(l.innerText.trim(), "");
            card.style.borderBottom = "3px solid #2ecc71";
            card.querySelector('img').onclick = () => loadMangaHostChapters(l.getAttribute('href'), l.innerText);
            onlineResults.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

async function loadMangaHostChapters(url, title) {
    onlineResults.innerHTML = "<p style='padding:20px;'>Carregando capítulos...</p>";
    const res = await fetch(PROXY + url);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll(".capitulo a, .chapters a")).reverse();
    
    currentMangaChapters = links.map(l => ({ name: l.innerText.trim(), url: l.getAttribute("href") }));
    onlineResults.innerHTML = `<h3 style='padding:15px'>${title}</h3>`;
    
    currentMangaChapters.forEach((ch, index) => {
        const div = document.createElement('div');
        div.className = "manga-item";
        div.innerHTML = `${ch.name} ➔`;
        div.onclick = () => { currentIndex = index; loadMangaHostPages(ch.url); };
        onlineResults.appendChild(div);
    });
}

async function loadMangaHostPages(url) {
    viewer.innerHTML = "Lendo páginas...";
    const res = await fetch(PROXY + url);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgs = doc.querySelectorAll(".read-slideshow img, .viewer-pages img, #slider img, .wp-manga-chapter-img");
    const urls = Array.from(imgs).map(i => i.getAttribute("src") || i.getAttribute("data-src")).filter(u => u);
    renderImages(urls);
}

function renderImages(urls) {
    onlineResults.style.display = 'none';
    viewer.style.display = 'block';
    viewer.innerHTML = '';
    urls.forEach(u => {
        const img = document.createElement('img');
        img.src = u.startsWith('http') ? u : 'https:' + u;
        img.loading = "lazy";
        viewer.appendChild(img);
    });
    addNavigation();
    window.scrollTo(0,0);
}

function addNavigation() {
    const nav = document.createElement('div');
    nav.className = "reader-footer";
    
    if (currentIndex < currentMangaChapters.length - 1) {
        const b = document.createElement('button');
        b.className = "next-chapter-btn";
        b.innerText = "PRÓXIMO CAPÍTULO ➔";
        b.onclick = () => { currentIndex++; loadMangaHostPages(currentMangaChapters[currentIndex].url); };
        nav.appendChild(b);
    }

    const bHome = document.createElement('button');
    bHome.className = "close-btn";
    bHome.innerText = "Sair da Leitura";
    bHome.onclick = () => location.reload();
    nav.appendChild(bHome);
    
    viewer.appendChild(nav);
}

function showLibrary() { location.reload(); }
function clearAppData() { if(confirm("Apagar tudo?")) { localStorage.clear(); location.reload(); } }
window.onscroll = () => { if(viewer.style.display === 'block') { const s = document.documentElement.scrollTop, h = document.documentElement.scrollHeight - document.documentElement.clientHeight; document.getElementById("progress-bar").style.width = (s/h*100) + "%"; } };