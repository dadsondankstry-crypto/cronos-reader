const PROXY = "https://fragrant-unit-a421.dadsondankstry.workers.dev/?url=";

const API_URL_DEX = "https://api.mangadex.org";
const API_URL_JIKAN = "https://api.jikan.moe/v4";
const API_URL_KITSU = "https://kitsu.io/api/edge";

const viewer = document.getElementById('viewer');
const onlineResults = document.getElementById('online-results');
const libraryView = document.getElementById('library-view');

let currentMangaChapters = [];
let currentIndex = -1;

window.onload = () => { /* Renderizar favoritos se houver */ };

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

let debounceTimer;
function searchMangaDebounced(q) {
    clearTimeout(debounceTimer);
    if (q.length < 3) { onlineResults.innerHTML = ""; libraryView.style.display = "block"; return; }
    debounceTimer = setTimeout(() => {
        libraryView.style.display = "none";
        onlineResults.innerHTML = "<p style='text-align:center; padding:20px;'>Buscando...</p>";
        const useScraper = document.getElementById('use-scraper').checked;
        
        onlineResults.innerHTML = "";
        if (useScraper) fetchLerManga(q);
        // Pode adicionar fetchJikan ou fetchKitsu aqui se desejar
    }, 600);
}

// SCRAPER OPÇÃO B: LERMANGÁ
async function fetchLerManga(q) {
    try {
        const res = await fetch(PROXY + `https://lermanga.org/?s=${encodeURIComponent(q)}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const items = doc.querySelectorAll(".film-list .item, .archive-manga .item-lermanga");
        
        items.forEach(item => {
            const link = item.querySelector("a");
            const title = item.querySelector("h3, .entry-title")?.innerText.trim();
            const img = item.querySelector("img")?.getAttribute("src");

            if (link && title) {
                const card = createMangaCard(title, img);
                card.querySelector('img').onclick = () => loadChapters(link.getAttribute("href"), title);
                onlineResults.appendChild(card);
            }
        });
    } catch (e) { console.error("Erro na busca:", e); }
}

function createMangaCard(title, cover) {
    const card = document.createElement('div');
    card.className = 'manga-card';
    card.innerHTML = `<img src="${cover || ''}"><p>${title}</p>`;
    return card;
}

async function loadChapters(url, title) {
    onlineResults.innerHTML = "<p style='padding:20px; text-align:center;'>Carregando capítulos...</p>";
    try {
        const res = await fetch(PROXY + url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        let links = Array.from(doc.querySelectorAll(".single-manga-chapters a, .capitulos-list a"));
        
        currentMangaChapters = links.map(l => ({ 
            name: l.innerText.trim(), 
            url: l.getAttribute("href") 
        })).reverse();

        onlineResults.innerHTML = `<h3 style='padding:15px; color:var(--primary)'>${title}</h3>`;
        currentMangaChapters.forEach((ch, index) => {
            const div = document.createElement('div');
            div.className = "manga-item";
            div.innerHTML = `<span>${ch.name}</span> <span>➔</span>`;
            div.onclick = () => { currentIndex = index; loadPages(ch.url); };
            onlineResults.appendChild(div);
        });
    } catch (e) { onlineResults.innerHTML = "Erro ao carregar capítulos."; }
}

async function loadPages(url) {
    window.scrollTo(0,0);
    viewer.style.display = 'block';
    onlineResults.style.display = 'none';
    viewer.innerHTML = "<p style='padding:50px; text-align:center;'>Abrindo páginas...</p>";
    
    try {
        const res = await fetch(PROXY + url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const imgs = doc.querySelectorAll(".reading-content img, .images-container img, #images-cap img");
        
        let urls = Array.from(imgs).map(i => i.getAttribute("src") || i.getAttribute("data-src") || i.getAttribute("data-lazy-src"));
        urls = urls.filter(u => u && u.includes("http"));

        viewer.innerHTML = "";
        urls.forEach(u => {
            const img = document.createElement('img');
            img.src = u;
            img.loading = "lazy";
            viewer.appendChild(img);
        });
        addNavigation();
    } catch (e) { viewer.innerHTML = "Erro ao carregar imagens."; }
}

function addNavigation() {
    const nav = document.createElement('div');
    nav.className = "reader-footer";
    
    if (currentIndex < currentMangaChapters.length - 1) {
        const bNext = document.createElement('button');
        bNext.className = "next-chapter-btn";
        const nextName = currentMangaChapters[currentIndex + 1].name;
        bNext.innerHTML = `PRÓXIMO: ${nextName} ➔`;
        bNext.onclick = () => { currentIndex++; loadPages(currentMangaChapters[currentIndex].url); };
        nav.appendChild(bNext);
    }

    const bExit = document.createElement('button');
    bExit.className = "exit-reader-btn";
    bExit.innerText = "Voltar à lista";
    bExit.onclick = () => { viewer.style.display='none'; onlineResults.style.display='block'; window.scrollTo(0,0); };
    nav.appendChild(bExit);
    
    viewer.appendChild(nav);
}

// Barra de progresso ao scroll
window.onscroll = () => {
    if(viewer.style.display === 'block') {
        const s = document.documentElement.scrollTop, h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        document.getElementById("progress-bar").style.width = (s/h*100) + "%";
    }
};