/* ============================================
   NOTYBOOK - Main Application
   ============================================ */

// ---- CONFIG ----
// MVP - Free tier API key (exposed intentionally for public deployment)
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ---- CONTENT MODERATION ----
const BLOCKED_KEYWORDS = [
    'gore', 'muerte', 'muerto', 'cadaver', 'cadáver', 'asesinato', 'decapitado',
    'violación', 'violacion', 'pedofilia', 'pornografía', 'pornografia', 'porno',
    'niños desnudos', 'menores desnudos', 'abuso infantil', 'explotación infantil',
    'explotacion infantil', 'child abuse', 'child porn', 'snuff', 'gore',
    'tortura', 'mutilación', 'mutilacion', 'suicidio como', 'cómo suicidarse',
    'como suicidarse', 'matar', 'asesinar', 'bomba casera', 'fabricar armas',
    'odio racial', 'supremacía blanca', 'supremacia blanca', 'nazi',
    'insultos trans', 'matar homosexuales', 'matar gays',
    'contenido sexual de menores', 'desnudos infantiles'
];

const WARNING_MESSAGE = '⚠️ ADVERTENCIA: La solicitud que has realizado contiene contenido que viola nuestras políticas editoriales. En Notybook NO mostramos contenido que promueva violencia, odio, explotación de menores ni contenido degradante. Este tipo de solicitudes pueden ser reportadas a las autoridades competentes. Por favor, realiza consultas respetuosas y constructivas.';

function isContentBlocked(text) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const lowerOriginal = text.toLowerCase();
    return BLOCKED_KEYWORDS.some(kw => {
        const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return lower.includes(kwNorm) || lowerOriginal.includes(kw);
    });
}

// ---- USER LOCALE & DATE ----
function getUserLocaleInfo() {
    const now = new Date();
    const lang = navigator.language || navigator.userLanguage || 'es';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
    const region = timezone.split('/');
    const continent = region[0] || '';
    const city = (region[1] || '').replace(/_/g, ' ');

    // Derive country/region hints from timezone
    let country = '';
    let regionName = '';
    const tzLower = timezone.toLowerCase();
    if (tzLower.includes('bogota')) { country = 'Colombia'; regionName = 'América Latina'; }
    else if (tzLower.includes('mexico')) { country = 'México'; regionName = 'América Latina'; }
    else if (tzLower.includes('buenos_aires')) { country = 'Argentina'; regionName = 'América Latina'; }
    else if (tzLower.includes('lima')) { country = 'Perú'; regionName = 'América Latina'; }
    else if (tzLower.includes('santiago')) { country = 'Chile'; regionName = 'América Latina'; }
    else if (tzLower.includes('caracas')) { country = 'Venezuela'; regionName = 'América Latina'; }
    else if (tzLower.includes('guayaquil') || tzLower.includes('quito')) { country = 'Ecuador'; regionName = 'América Latina'; }
    else if (tzLower.includes('sao_paulo') || tzLower.includes('brasilia')) { country = 'Brasil'; regionName = 'América Latina'; }
    else if (tzLower.includes('new_york') || tzLower.includes('chicago') || tzLower.includes('los_angeles')) { country = 'Estados Unidos'; regionName = 'Norteamérica'; }
    else if (tzLower.includes('madrid') || tzLower.includes('paris') || tzLower.includes('london') || tzLower.includes('berlin')) { country = 'Europa'; regionName = 'Europa'; }
    else if (continent === 'America') { country = city; regionName = 'América Latina'; }
    else if (continent === 'Europe') { country = city; regionName = 'Europa'; }
    else if (continent === 'Asia') { country = city; regionName = 'Asia'; }
    else if (continent === 'Africa') { country = city; regionName = 'África'; }
    else { country = city || 'Internacional'; regionName = 'Internacional'; }

    const dateFormatted = now.toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const isoDate = now.toISOString().split('T')[0];

    return { lang, timezone, country, regionName, continent, city, dateFormatted, isoDate, now };
}

const userLocale = getUserLocaleInfo();

function setHeaderDate() {
    document.getElementById('headerDate').textContent = getTodayFormatted().toUpperCase();
}

// ---- NEWS LOADING ----
function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayFormatted() {
    const now = new Date();
    return now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadNews() {
    const today = getTodayDate();
    const todayHuman = getTodayFormatted();

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'system',
                    content: `Eres un periodista profesional que proporciona noticias reales y actuales.
                    HOY ES: ${todayHuman} (${today}). Esta es la fecha REAL del sistema del usuario obtenida con new Date() de JavaScript.
                    El usuario se encuentra en: ${userLocale.country} (${userLocale.regionName}), zona horaria: ${userLocale.timezone}.
                    OBLIGATORIO: Todas las noticias DEBEN ser de la fecha ${today} o máximo del día anterior. NO uses noticias antiguas.
                    El campo "fecha" de cada noticia DEBE ser exactamente "${today}".
                    FUENTE: El campo "fuente" SIEMPRE debe ser "Notybook IA". NUNCA cites medios de comunicación reales (CNN, Reuters, BBC, etc.) como fuente. Todo el contenido es una síntesis generada por IA para Notybook.
                    Contextualiza las noticias para la región del usuario cuando sea relevante.
                    Debes responder SOLO con un JSON válido, sin texto adicional.
                    Las noticias deben ser reales, verificables y actuales.
                    NO incluir noticias violentas, de odio, que expongan menores o contenido grotesco.
                    Todas las noticias deben respetar la dignidad humana.`
                }, {
                    role: 'user',
                    content: `Hoy es ${todayHuman} (${today}). Dame 7 noticias de HOY ${today}, contextualizadas para un lector en ${userLocale.country}/${userLocale.regionName}, en formato JSON con esta estructura exacta:
                    {
                        "politica": {
                            "titulo": "título de noticia política progresista/izquierda de hoy ${today}, relevante para ${userLocale.regionName}",
                            "resumen": "resumen de 2-3 oraciones",
                            "fuente": "Notybook IA",
                            "fecha": "${today}",
                            "imagen_keywords": "2-3 palabras clave EN INGLÉS para buscar una imagen representativa (ej: congress democracy, protest rally, parliament vote). NO usar nombres de personas ni marcas."
                        },
                        "economia": {
                            "titulo": "título de noticia económica seria de hoy ${today}, con impacto en ${userLocale.country} o ${userLocale.regionName}",
                            "resumen": "resumen de 2-3 oraciones",
                            "fuente": "Notybook IA",
                            "fecha": "${today}",
                            "imagen_keywords": "2-3 palabras EN INGLÉS (ej: stock market, currency exchange, bank finance)"
                        },
                        "tecnologia": {
                            "titulo": "título sobre avances recientes en IA (Claude, ChatGPT, DeepSeek, Qwen, Gemini u otros modelos principales) de hoy ${today}",
                            "resumen": "resumen de 2-3 oraciones",
                            "fuente": "Notybook IA",
                            "fecha": "${today}",
                            "imagen_keywords": "2-3 palabras EN INGLÉS (ej: artificial intelligence, robot technology, neural network)"
                        },
                        "deportes": {
                            "titulo": "la noticia deportiva MÁS relevante de hoy ${today}. Priorizar: ciclismo UCI World Tour (carreras actuales, etapas, resultados), fútbol (ligas principales, Champions, selecciones de ${userLocale.regionName}), atletismo, natación, gimnasia, boxeo, lucha. Solo la más importante del momento.",
                            "resumen": "resumen de 2-3 oraciones con datos concretos (resultados, tiempos, clasificaciones)",
                            "fuente": "Notybook IA",
                            "fecha": "${today}",
                            "imagen_keywords": "2-3 palabras EN INGLÉS del deporte específico (ej: cycling race, soccer stadium, athletics sprint)"
                        },
                        "guerra1": {
                            "titulo": "noticia de hoy ${today} sobre conflicto Israel-Irán, impacto en Israel",
                            "resumen": "resumen de 2-3 oraciones sin contenido gráfico violento",
                            "fuente": "Notybook IA",
                            "fecha": "${today}",
                            "imagen_keywords": "2-3 palabras EN INGLÉS NO violentas (ej: diplomacy meeting, middle east map, peace negotiation). NUNCA usar: war, bomb, explosion, military attack, destruction."
                        },
                        "guerra2": {
                            "titulo": "segunda noticia de hoy ${today} sobre el conflicto, aspecto diplomático o humanitario",
                            "resumen": "resumen de 2-3 oraciones",
                            "fuente": "Notybook IA",
                            "fecha": "${today}",
                            "imagen_keywords": "2-3 palabras EN INGLÉS (ej: humanitarian aid, united nations, diplomacy)"
                        },
                        "guerra3": {
                            "titulo": "tercera noticia de hoy ${today}, consecuencias geopolíticas del conflicto",
                            "resumen": "resumen de 2-3 oraciones",
                            "fuente": "Notybook IA",
                            "fecha": "${today}",
                            "imagen_keywords": "2-3 palabras EN INGLÉS (ej: geopolitics globe, world leaders, international summit)"
                        }
                    }
                    Solo responde con el JSON, nada más.`
                }],
                temperature: 0.7,
                max_tokens: 2500
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        let newsData;
        try {
            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            newsData = JSON.parse(jsonStr);
        } catch (e) {
            console.error('Error parsing news JSON:', e);
            loadFallbackNews();
            return;
        }

        renderNewsCard('newsPolitica', newsData.politica, 'politica');
        renderNewsCard('newsEconomia', newsData.economia, 'economia');
        renderNewsCard('newsTech', newsData.tecnologia, 'tecnologia');
        renderNewsCard('newsDeportes', newsData.deportes, 'deportes');
        renderNewsCard('war1', newsData.guerra1, 'guerra');
        renderNewsCard('war2', newsData.guerra2, 'guerra');
        renderNewsCard('war3', newsData.guerra3, 'guerra');

    } catch (error) {
        console.error('Error loading news:', error);
        loadFallbackNews();
    }
}

// Build image URL from keywords using free image services
function getNewsImageUrl(keywords, category) {
    if (keywords && typeof keywords === 'string' && keywords.trim()) {
        // Clean keywords: take only valid English words
        const cleanKeywords = keywords
            .replace(/[^a-zA-Z\s]/g, '')
            .trim()
            .split(/\s+/)
            .slice(0, 3)
            .join(',');

        if (cleanKeywords) {
            // Use loremflickr.com - free, no API key, CC-licensed images
            return `https://loremflickr.com/600/400/${encodeURIComponent(cleanKeywords)}?random=${Date.now() + Math.random()}`;
        }
    }
    // Fallback to category-based Unsplash images
    return getFallbackImage(category);
}

function getFallbackImage(category) {
    const fallbacks = {
        politica: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&h=400&fit=crop',
        economia: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop',
        tecnologia: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=400&fit=crop',
        deportes: 'https://images.unsplash.com/photo-1461896836934-bd45ba8bcc44?w=600&h=400&fit=crop',
        guerra: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=600&h=400&fit=crop'
    };
    return fallbacks[category] || fallbacks.politica;
}

function renderNewsCard(cardId, newsItem, category) {
    const card = document.getElementById(cardId);
    if (!card || !newsItem) return;

    const imgEl = card.querySelector('.card-image');
    const titleEl = card.querySelector('.card-title');
    const summaryEl = card.querySelector('.card-summary');
    const sourceEl = card.querySelector('.card-source');
    const dateEl = card.querySelector('.card-date');

    // Set image from AI-generated keywords
    imgEl.classList.remove('skeleton-img');
    const img = document.createElement('img');
    img.src = getNewsImageUrl(newsItem.imagen_keywords, category);
    img.alt = newsItem.titulo;
    img.loading = 'lazy';
    // If loremflickr fails, fallback to Unsplash category image
    img.onerror = function() {
        if (!this.dataset.retried) {
            this.dataset.retried = 'true';
            this.src = getFallbackImage(category);
        } else {
            this.src = `https://via.placeholder.com/600x400/1C2333/D4A017?text=${encodeURIComponent(category.toUpperCase())}`;
        }
    };
    imgEl.appendChild(img);

    // Set text
    titleEl.classList.remove('skeleton-text');
    titleEl.textContent = newsItem.titulo;

    summaryEl.classList.remove('skeleton-text');
    summaryEl.textContent = newsItem.resumen;

    sourceEl.textContent = newsItem.fuente;
    dateEl.textContent = newsItem.fecha;
}

function loadFallbackNews() {
    const today = getTodayDate();
    const fallback = {
        politica: {
            titulo: 'Movimientos sociales en América Latina impulsan reformas de inclusión',
            resumen: 'Diversos países latinoamericanos avanzan en legislaciones que promueven la equidad social y el acceso universal a servicios básicos, marcando una tendencia progresista en la región.',
            fuente: 'Notybook IA',
            fecha: today,
            imagen_keywords: 'latin america congress democracy'
        },
        economia: {
            titulo: 'Bancos centrales evalúan el impacto de las criptomonedas en la economía global',
            resumen: 'Las principales economías del mundo analizan nuevas regulaciones para las monedas digitales mientras el Bitcoin muestra volatilidad en los mercados internacionales.',
            fuente: 'Notybook IA',
            fecha: today,
            imagen_keywords: 'cryptocurrency bitcoin finance'
        },
        tecnologia: {
            titulo: 'Nuevos modelos de IA superan barreras en razonamiento y comprensión',
            resumen: 'Claude, ChatGPT y modelos chinos como DeepSeek continúan avanzando en capacidades de razonamiento, programación y análisis multimodal, redefiniendo los límites de la inteligencia artificial.',
            fuente: 'Notybook IA',
            fecha: today,
            imagen_keywords: 'artificial intelligence robot neural'
        },
        deportes: {
            titulo: 'El World Tour de ciclismo enciende la temporada con etapas decisivas',
            resumen: 'Las principales carreras del calendario UCI World Tour mantienen la emoción con batallas en la montaña y sprints espectaculares. El pelotón internacional se prepara para las grandes clásicas de primavera.',
            fuente: 'Notybook IA',
            fecha: today,
            imagen_keywords: 'cycling race peloton mountain'
        },
        guerra1: {
            titulo: 'Tensiones en Medio Oriente: impacto diplomático del conflicto Israel-Irán',
            resumen: 'La comunidad internacional intensifica esfuerzos diplomáticos para mediar en el conflicto, mientras Israel evalúa las consecuencias económicas y de seguridad de las recientes escaladas.',
            fuente: 'Notybook IA',
            fecha: today,
            imagen_keywords: 'diplomacy middle east negotiation'
        },
        guerra2: {
            titulo: 'Organizaciones humanitarias alertan sobre crisis en la región',
            resumen: 'Las agencias de la ONU y organizaciones como la Cruz Roja reportan necesidades crecientes de ayuda humanitaria en las zonas afectadas por el conflicto.',
            fuente: 'Notybook IA',
            fecha: today,
            imagen_keywords: 'humanitarian aid united nations'
        },
        guerra3: {
            titulo: 'El conflicto Israel-Irán reconfigura las alianzas geopolíticas globales',
            resumen: 'Las potencias mundiales ajustan sus posiciones estratégicas mientras el conflicto en Medio Oriente genera nuevas dinámicas en las relaciones internacionales.',
            fuente: 'Notybook IA',
            fecha: today,
            imagen_keywords: 'world leaders international summit'
        }
    };

    renderNewsCard('newsPolitica', fallback.politica, 'politica');
    renderNewsCard('newsEconomia', fallback.economia, 'economia');
    renderNewsCard('newsTech', fallback.tecnologia, 'tecnologia');
    renderNewsCard('newsDeportes', fallback.deportes, 'deportes');
    renderNewsCard('war1', fallback.guerra1, 'guerra');
    renderNewsCard('war2', fallback.guerra2, 'guerra');
    renderNewsCard('war3', fallback.guerra3, 'guerra');
}

// ---- MARKETS DASHBOARD ----
const MARKET_SYMBOLS = [
    { symbol: 'AAPL', name: 'Apple', sector: 'Tech' },
    { symbol: 'MSFT', name: 'Microsoft', sector: 'Tech' },
    { symbol: 'GOOGL', name: 'Alphabet', sector: 'Tech' },
    { symbol: 'AMZN', name: 'Amazon', sector: 'E-Commerce' },
    { symbol: 'NVDA', name: 'NVIDIA', sector: 'Semiconductores' },
    { symbol: 'META', name: 'Meta', sector: 'Social Media' },
    { symbol: 'TSLA', name: 'Tesla', sector: 'EV / Energía' },
    { symbol: 'MELI', name: 'MercadoLibre', sector: 'E-Commerce' },
    { symbol: 'OIL', name: 'Petróleo WTI', sector: 'Commodities' },
    { symbol: 'GOLD', name: 'Oro', sector: 'Commodities' }
];

let currentMarketData = null;
let mainChartInstance = null;
let performanceChartInstance = null;
let sectorChartInstance = null;
let sparklineCharts = {};
let selectedSymbol = 'NVDA';

// Generate realistic-looking historical price data
function generateHistoricalData(basePrice, change, points) {
    const data = [];
    const volatility = basePrice * 0.008;
    let price = basePrice - change - (Math.random() * volatility * points * 0.05);

    for (let i = 0; i < points; i++) {
        const trend = (change / points) * (1 + (Math.random() - 0.4) * 0.5);
        const noise = (Math.random() - 0.5) * volatility;
        price += trend + noise;
        price = Math.max(price, basePrice * 0.85);
        data.push(parseFloat(price.toFixed(2)));
    }
    // Ensure last point matches current price
    data[data.length - 1] = basePrice;
    return data;
}

function generateTimeLabels(points, period) {
    const labels = [];
    const now = new Date();
    for (let i = points - 1; i >= 0; i--) {
        const d = new Date(now);
        switch (period) {
            case '1D':
                d.setMinutes(d.getMinutes() - i * 5);
                labels.push(d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }));
                break;
            case '1W':
                d.setHours(d.getHours() - i * 2);
                labels.push(d.toLocaleDateString('es', { weekday: 'short', hour: '2-digit' }));
                break;
            case '1M':
                d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('es', { day: '2-digit', month: 'short' }));
                break;
            case '3M':
                d.setDate(d.getDate() - i * 3);
                labels.push(d.toLocaleDateString('es', { day: '2-digit', month: 'short' }));
                break;
            case '1Y':
                d.setDate(d.getDate() - i * 7);
                labels.push(d.toLocaleDateString('es', { month: 'short', year: '2-digit' }));
                break;
        }
    }
    return labels;
}

function getPeriodPoints(period) {
    switch (period) {
        case '1D': return 78;
        case '1W': return 56;
        case '1M': return 30;
        case '3M': return 30;
        case '1Y': return 52;
        default: return 78;
    }
}

async function loadMarkets() {
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'system',
                    content: 'Eres un analista financiero. Responde SOLO con JSON válido, sin texto adicional.'
                }, {
                    role: 'user',
                    content: `Dame los precios aproximados actuales (marzo 2026) de estas acciones y commodities en formato JSON.
                    Necesito: AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, MELI (MercadoLibre), OIL (petróleo WTI), GOLD (oro por onza).
                    Formato exacto:
                    {
                        "AAPL": {"price": 195.50, "change": 1.25, "percent": 0.64},
                        "MSFT": {"price": 420.30, "change": -2.10, "percent": -0.50}
                    }
                    Incluye todos los 10 símbolos. Los valores deben ser realistas para marzo 2026.
                    Solo el JSON, nada más.`
                }],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const marketData = JSON.parse(jsonStr);

        currentMarketData = marketData;
        renderDashboard(marketData);
        renderTicker(marketData);

    } catch (error) {
        console.error('Error loading markets:', error);
        loadFallbackMarkets();
    }
}

function renderDashboard(data) {
    currentMarketData = data;
    renderSideCards(data);
    selectSymbol(selectedSymbol);
    renderPerformanceChart(data);
    renderSectorChart(data);
}

// --- Side Panel Mini Cards with Sparklines ---
function renderSideCards(data) {
    const container = document.getElementById('dashSideCards');
    container.innerHTML = '';
    sparklineCharts = {};

    MARKET_SYMBOLS.forEach(item => {
        const mkt = data[item.symbol];
        if (!mkt) return;

        const isUp = mkt.change >= 0;
        const card = document.createElement('div');
        card.className = `dash-mini-card ${isUp ? 'up' : 'down'} ${item.symbol === selectedSymbol ? 'selected' : ''}`;
        card.dataset.symbol = item.symbol;

        const sparkId = `spark-${item.symbol}`;
        card.innerHTML = `
            <div class="mini-card-top">
                <span class="mini-card-symbol">${item.symbol}</span>
                <span class="mini-card-name">${item.name}</span>
            </div>
            <div class="mini-card-bottom">
                <span class="mini-card-price">$${formatNumber(mkt.price)}</span>
                <span class="mini-card-change">${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${mkt.percent.toFixed(2)}%</span>
            </div>
            <div class="mini-sparkline">
                <canvas id="${sparkId}"></canvas>
            </div>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.dash-mini-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectSymbol(item.symbol);
        });

        container.appendChild(card);

        // Draw sparkline after DOM insertion
        requestAnimationFrame(() => {
            drawSparkline(sparkId, mkt.price, mkt.change, isUp);
        });
    });
}

function drawSparkline(canvasId, price, change, isUp) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 180;
    canvas.height = 80;

    const sparkData = generateHistoricalData(price, change, 20);
    const color = isUp ? '#00E890' : '#FF6B6B';
    const bgColor = isUp ? 'rgba(0, 232, 144, 0.08)' : 'rgba(255, 107, 107, 0.08)';

    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    const padding = 4;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill area
    ctx.beginPath();
    sparkData.forEach((val, i) => {
        const x = padding + (i / (sparkData.length - 1)) * w;
        const y = padding + h - ((val - min) / range) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + w, padding + h);
    ctx.lineTo(padding, padding + h);
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    sparkData.forEach((val, i) => {
        const x = padding + (i / (sparkData.length - 1)) * w;
        const y = padding + h - ((val - min) / range) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // End dot
    const lastX = padding + w;
    const lastY = padding + h - ((sparkData[sparkData.length - 1] - min) / range) * h;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

// --- Main Chart ---
function selectSymbol(symbol) {
    selectedSymbol = symbol;
    const item = MARKET_SYMBOLS.find(m => m.symbol === symbol);
    const mkt = currentMarketData[symbol];
    if (!item || !mkt) return;

    const isUp = mkt.change >= 0;

    document.getElementById('mainChartSymbol').textContent = symbol;
    document.getElementById('mainChartName').textContent = item.name;
    document.getElementById('mainChartPrice').textContent = `$${formatNumber(mkt.price)}`;

    const changeEl = document.getElementById('mainChartChange');
    changeEl.textContent = `${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${mkt.change.toFixed(2)} (${isUp ? '+' : ''}${mkt.percent.toFixed(2)}%)`;
    changeEl.className = `dash-chart-change ${isUp ? 'up' : 'down'}`;

    // Extra info
    const open = (mkt.price - mkt.change).toFixed(2);
    const high = (mkt.price + Math.abs(mkt.change) * (0.3 + Math.random() * 0.5)).toFixed(2);
    const low = (mkt.price - Math.abs(mkt.change) * (0.5 + Math.random() * 0.8)).toFixed(2);
    const vol = (Math.random() * 200 + 20).toFixed(1) + 'M';

    document.getElementById('mainChartOpen').textContent = `$${open}`;
    document.getElementById('mainChartHigh').textContent = `$${high}`;
    document.getElementById('mainChartLow').textContent = `$${low}`;
    document.getElementById('mainChartVol').textContent = vol;

    const activePeriod = document.querySelector('.period-btn.active')?.dataset.period || '1D';
    drawMainChart(symbol, activePeriod);
}

function drawMainChart(symbol, period) {
    const mkt = currentMarketData[symbol];
    if (!mkt) return;

    const points = getPeriodPoints(period);
    const historicalData = generateHistoricalData(mkt.price, mkt.change * (period === '1D' ? 1 : period === '1W' ? 3 : period === '1M' ? 8 : period === '3M' ? 15 : 30), points);
    const labels = generateTimeLabels(points, period);
    const isUp = mkt.change >= 0;

    const canvas = document.getElementById('mainChart');
    const ctx = canvas.getContext('2d');

    if (mainChartInstance) {
        mainChartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    if (isUp) {
        gradient.addColorStop(0, 'rgba(0, 232, 144, 0.25)');
        gradient.addColorStop(0.5, 'rgba(0, 232, 144, 0.08)');
        gradient.addColorStop(1, 'rgba(0, 232, 144, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(255, 107, 107, 0.25)');
        gradient.addColorStop(0.5, 'rgba(255, 107, 107, 0.08)');
        gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
    }

    mainChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: historicalData,
                borderColor: isUp ? '#00E890' : '#FF6B6B',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: isUp ? '#00E890' : '#FF6B6B',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutCubic'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    titleColor: '#D4A017',
                    bodyColor: '#E6EDF3',
                    borderColor: 'rgba(212, 160, 23, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { family: 'Orbitron', size: 11 },
                    bodyFont: { family: 'Inter', size: 13 },
                    displayColors: false,
                    callbacks: {
                        title: (ctx) => ctx[0].label,
                        label: (ctx) => `$${ctx.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawTicks: false
                    },
                    ticks: {
                        color: '#6E7681',
                        font: { family: 'Inter', size: 10 },
                        maxTicksLimit: 8,
                        maxRotation: 0
                    },
                    border: { display: false }
                },
                y: {
                    position: 'right',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawTicks: false
                    },
                    ticks: {
                        color: '#6E7681',
                        font: { family: 'Orbitron', size: 10 },
                        callback: (val) => '$' + val.toFixed(2),
                        maxTicksLimit: 6
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// Period buttons
document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawMainChart(selectedSymbol, btn.dataset.period);
    });
});

// --- Performance Bar Chart ---
function renderPerformanceChart(data) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (performanceChartInstance) performanceChartInstance.destroy();

    const symbols = MARKET_SYMBOLS.map(m => m.symbol);
    const percents = symbols.map(s => data[s]?.percent || 0);
    const colors = percents.map(p => p >= 0 ? '#00E890' : '#FF6B6B');
    const borderColors = percents.map(p => p >= 0 ? '#00C278' : '#E05252');

    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: symbols,
            datasets: [{
                data: percents,
                backgroundColor: colors.map(c => c + '99'),
                borderColor: borderColors,
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    titleColor: '#D4A017',
                    bodyColor: '#E6EDF3',
                    borderColor: 'rgba(212, 160, 23, 0.3)',
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { family: 'Orbitron', size: 11 },
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.parsed.y;
                            return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)', drawTicks: false },
                    ticks: {
                        color: '#D4A017',
                        font: { family: 'Orbitron', size: 9, weight: 700 },
                        maxRotation: 45
                    },
                    border: { display: false }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)', drawTicks: false },
                    ticks: {
                        color: '#6E7681',
                        font: { family: 'Orbitron', size: 10 },
                        callback: (val) => val.toFixed(1) + '%'
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// --- Sector Doughnut Chart ---
function renderSectorChart(data) {
    const canvas = document.getElementById('sectorChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (sectorChartInstance) sectorChartInstance.destroy();

    // Group by sector
    const sectors = {};
    MARKET_SYMBOLS.forEach(item => {
        const mkt = data[item.symbol];
        if (!mkt) return;
        if (!sectors[item.sector]) sectors[item.sector] = 0;
        sectors[item.sector] += mkt.price;
    });

    const sectorLabels = Object.keys(sectors);
    const sectorValues = Object.values(sectors);
    const sectorColors = [
        '#00E890', '#D4A017', '#48CAE4', '#7B2FBE',
        '#E07A5F', '#40E0D0', '#FF6B6B'
    ];

    sectorChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sectorLabels,
            datasets: [{
                data: sectorValues,
                backgroundColor: sectorColors.slice(0, sectorLabels.length).map(c => c + 'CC'),
                borderColor: sectorColors.slice(0, sectorLabels.length),
                borderWidth: 2,
                hoverOffset: 10,
                spacing: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            },
            cutout: '55%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8B949E',
                        font: { family: 'Inter', size: 11 },
                        padding: 12,
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    titleColor: '#D4A017',
                    bodyColor: '#E6EDF3',
                    borderColor: 'rgba(212, 160, 23, 0.3)',
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { family: 'Orbitron', size: 11 },
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return ` ${ctx.label}: ${pct}%`;
                        }
                    }
                }
            }
        }
    });
}

// --- Ticker ---
function renderTicker(data) {
    const track = document.getElementById('tickerTrack');
    let tickerHTML = '';

    for (let i = 0; i < 2; i++) {
        MARKET_SYMBOLS.forEach(item => {
            const mkt = data[item.symbol];
            if (!mkt) return;
            const isUp = mkt.change >= 0;
            tickerHTML += `
                <span class="ticker-item">
                    <span class="ticker-symbol">${item.symbol}</span>
                    <span class="ticker-price">$${formatNumber(mkt.price)}</span>
                    <span class="ticker-change ${isUp ? 'ticker-up' : 'ticker-down'}">${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${mkt.percent.toFixed(2)}%</span>
                </span>
            `;
        });
    }
    track.innerHTML = tickerHTML;
}

function formatNumber(num) {
    if (num >= 1000) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toFixed(2);
}

function loadFallbackMarkets() {
    const fallbackData = {
        AAPL: { price: 198.45, change: 2.30, percent: 1.17 },
        MSFT: { price: 435.20, change: -1.50, percent: -0.34 },
        GOOGL: { price: 178.90, change: 3.15, percent: 1.79 },
        AMZN: { price: 210.75, change: 0.85, percent: 0.40 },
        NVDA: { price: 142.30, change: 5.20, percent: 3.79 },
        META: { price: 620.40, change: -3.10, percent: -0.50 },
        TSLA: { price: 285.60, change: -8.40, percent: -2.86 },
        MELI: { price: 2150.00, change: 15.30, percent: 0.72 },
        OIL: { price: 72.35, change: -0.45, percent: -0.62 },
        GOLD: { price: 3045.80, change: 12.50, percent: 0.41 }
    };
    renderDashboard(fallbackData);
    renderTicker(fallbackData);
}

// ---- CHAT WIDGET TOGGLE ----
const chatFab = document.getElementById('chatFab');
const chatWidget = document.getElementById('chatWidget');
const chatWidgetClose = document.getElementById('chatWidgetClose');
const navAsistente = document.getElementById('navAsistente');

function toggleChat() {
    const isOpen = chatWidget.classList.toggle('open');
    chatFab.classList.toggle('active', isOpen);
    if (isOpen) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        setTimeout(() => chatInput.focus(), 300);
    }
}

function closeChat() {
    chatWidget.classList.remove('open');
    chatFab.classList.remove('active');
}

chatFab.addEventListener('click', toggleChat);
chatWidgetClose.addEventListener('click', closeChat);

if (navAsistente) {
    navAsistente.addEventListener('click', (e) => {
        e.preventDefault();
        if (!chatWidget.classList.contains('open')) {
            toggleChat();
        }
    });
}

// Handle mobile keyboard - keep input visible
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (chatWidget.classList.contains('open')) {
            const vvHeight = window.visualViewport.height;
            chatWidget.style.height = vvHeight + 'px';
            chatWidget.style.maxHeight = vvHeight + 'px';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
    window.visualViewport.addEventListener('scroll', () => {
        if (chatWidget.classList.contains('open')) {
            chatWidget.style.bottom = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop + 'px';
        }
    });
}

// ---- CHAT / AI ASSISTANT ----
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const chatSend = document.getElementById('chatSend');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';
    chatSend.disabled = true;

    // Check for blocked content
    if (isContentBlocked(message)) {
        addMessage(WARNING_MESSAGE, 'bot', true);
        chatSend.disabled = false;
        return;
    }

    // Show typing indicator
    const typingEl = showTyping();

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'system',
                    content: `Eres el asistente de noticias de Notybook, un portal de noticias que respeta la dignidad humana.

                    HOY ES: ${getTodayFormatted()} (${getTodayDate()}). Fecha real obtenida del navegador del usuario.
                    El usuario está en: ${userLocale.country} (${userLocale.regionName}), zona horaria: ${userLocale.timezone}.

                    PRECISIÓN Y VERACIDAD (REGLA MÁXIMA - LA CREDIBILIDAD ES TODO):
                    - NUNCA inventes datos, nombres, cifras, fechas ni resultados. Si no estás seguro de algo, DILO CLARAMENTE.
                    - Si no tienes información actualizada o verificada sobre lo que el usuario pregunta, responde:
                      "⚠️ **Nota de transparencia:** No cuento con información verificada sobre este tema en tiempo real. Te recomiendo consultar fuentes oficiales para obtener datos actualizados."
                    - Si la pregunta es sobre eventos muy recientes o en curso (elecciones, candidatos, resultados deportivos, conflictos activos), y no tienes certeza absoluta de que tus datos son los más recientes, ADVIERTE al usuario:
                      "📋 **Importante:** Esta información corresponde a lo conocido hasta [fecha/momento]. Te sugiero verificar en fuentes oficiales si ha habido actualizaciones recientes."
                    - Si hay ambigüedad en la pregunta (por ejemplo: "candidatos presidenciales en Colombia" sin especificar año o elección), PREGUNTA antes de responder:
                      "Para darte información precisa: ¿te refieres a las elecciones de [año]? ¿O a un proceso electoral específico?"
                    - PREFIERE decir "no tengo esa información con certeza" a dar un dato que PUEDA ser incorrecto. Una respuesta honesta siempre es mejor que una respuesta inventada.
                    - Cuando proporciones datos, indica siempre el contexto temporal: "Según información de [mes/año]...", "Hasta [fecha], el estado era..."
                    - Si el usuario valida o corrige un dato, agradece y ajusta la respuesta.
                    - JAMÁS mezcles datos de diferentes periodos como si fueran actuales (ej: no uses candidatos de 2022 para responder sobre 2026).

                    COMPORTAMIENTO PRINCIPAL:
                    - Por defecto, TODA la información que proporciones debe ser de HOY ${getTodayDate()} o las últimas horas.
                    - Si el usuario pregunta por algo que pasó en una fecha anterior, responde sobre esa fecha específica.
                    - Busca y reporta tendencias actuales en redes sociales (X/Twitter, TikTok, Instagram, Reddit, etc.) cuando sea relevante para lo que el usuario pregunta.
                    - Si el usuario pregunta "cómo está Tel Aviv", "qué pasa en Ucrania", "cómo va la liga", etc., dale información ACTUAL y detallada sobre la situación real.
                    - Incluye datos concretos SOLO si estás seguro de su veracidad: cifras, nombres, resultados, fechas, fuentes.
                    - Menciona qué se dice en redes sociales y qué es tendencia cuando sea pertinente.
                    - Cuando no tengas certeza, ofrece contexto general y sugiere fuentes donde el usuario pueda verificar.

                    NEUTRALIDAD ABSOLUTA:
                    - NO tomes partido ni opines. Solo informa los hechos.
                    - NO juzgues acciones de gobiernos, personas, organizaciones ni movimientos.
                    - Si el usuario te pide tu opinión, responde: "En Notybook no emitimos opiniones ni juicios. Te mostramos los hechos para que formes tu propio criterio."
                    - Presenta todos los lados de una historia cuando haya múltiples perspectivas, sin favorecer ninguna.
                    - No uses adjetivos valorativos (bueno, malo, terrible, maravilloso). Usa lenguaje neutro y descriptivo.

                    RESTRICCIONES ESTRICTAS:
                    - NUNCA proporciones contenido que promueva odio, violencia gráfica o discriminación.
                    - NUNCA muestres contenido que exponga o dañe a menores de edad.
                    - NUNCA muestres contenido grotesco como personas fallecidas o accidentadas con detalles gráficos.
                    - NUNCA uses insultos relacionados con identidad de género, raza o etnia.
                    - Si el usuario pide contenido que viole estas restricciones, responde: "Esta solicitud viola nuestras políticas editoriales. Este tipo de contenido es un delito y puede ser reportado a las autoridades competentes."

                    FORMATO DE RESPUESTA (MUY IMPORTANTE, sigue este formato siempre):
                    - Responde en español.
                    - Comienza SIEMPRE con un encabezado usando "##" con un emoji serio/profesional relacionado con el tema. Ejemplos:
                      - Política: 🏛️, ⚖️, 🗳️
                      - Economía/Finanzas: 📊, 💹, 📈, 🏦
                      - Tecnología/IA: 🤖, 💻, ⚡, 🔬
                      - Deportes: ⚽, 🚴, 🏅, 🏆
                      - Guerra/Conflictos: 🌍, 🕊️, 📡, 🔴
                      - Redes sociales/Tendencias: 📱, 🔥, 📢
                      - General: 📰, 🔎, 📋, 🗞️
                    - Usa subsecciones con "###" cuando necesites separar temas.
                    - Usa **negritas** para nombres propios, cifras clave, fechas y datos importantes.
                    - Usa listas con "- " para enumerar datos, puntos clave o fuentes.
                    - Al final, agrega una línea con "---" y luego "📌 **Fuentes:** Síntesis elaborada por Notybook IA a partir de reportes de prensa. Verifica en fuentes oficiales."
                    - NUNCA cites medios de comunicación reales (CNN, Reuters, BBC, AP, EFE, etc.) como fuente directa. Todo el contenido es generado por IA. Usa frases como "según reportes de prensa", "de acuerdo con información pública", "según fuentes internacionales".
                    - Si mencionas tendencias, usa el formato: "🔥 **Tendencia en [plataforma]:** descripción"
                    - Mantén párrafos cortos (2-3 oraciones máximo).
                    - NO uses emojis en exceso, solo los indicados arriba de forma estratégica para dar estructura visual.
                    - El tono debe ser profesional, periodístico, elegante.`
                }, {
                    role: 'user',
                    content: message
                }],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        removeTyping(typingEl);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const status = response.status;
            console.error('Groq API error:', status, errorData);

            if (status === 429) {
                addMessage('## ⏳ Límite de solicitudes alcanzado\n\nEl servicio de IA ha alcanzado el límite temporal de consultas. Por favor, espera **1-2 minutos** e intenta de nuevo.\n\n---\n📌 Esto ocurre porque usamos un plan gratuito con límite de solicitudes por minuto.', 'bot');
            } else if (status === 401 || status === 403) {
                addMessage('## ⚠️ Error de autenticación\n\nHubo un problema con el servicio de IA. Nuestro equipo ha sido notificado.\n\n---\n📌 Intenta de nuevo más tarde.', 'bot');
            } else if (status >= 500) {
                addMessage('## 🔧 Servicio temporalmente no disponible\n\nEl servidor de IA está experimentando problemas. Esto suele resolverse en pocos minutos.\n\n---\n📌 Intenta tu consulta nuevamente en un momento.', 'bot');
            } else {
                addMessage(`## ⚠️ Error en el servicio\n\nNo pudimos procesar tu solicitud (código: **${status}**). Intenta de nuevo en un momento.\n\n---\n📌 Si el problema persiste, recarga la página.`, 'bot');
            }
        } else {
            const data = await response.json();

            if (data.error) {
                console.error('Groq response error:', data.error);
                addMessage('## ⚠️ Error procesando la solicitud\n\nEl servicio de IA no pudo generar una respuesta. Intenta reformular tu pregunta o espera un momento.\n\n---\n📌 Si el error persiste, recarga la página.', 'bot');
            } else {
                const reply = data.choices[0].message.content;
                addMessage(reply, 'bot');
            }
        }

    } catch (error) {
        removeTyping(typingEl);
        console.error('Chat error:', error);

        if (!navigator.onLine) {
            addMessage('## 📡 Sin conexión a internet\n\nParece que no tienes conexión a internet. Verifica tu conexión e intenta nuevamente.', 'bot');
        } else {
            addMessage('## ⚠️ Error de conexión\n\nNo se pudo conectar con el servicio de IA. Esto puede deberse a:\n\n- Conexión inestable\n- El servicio está temporalmente caído\n\nIntenta de nuevo en un momento.\n\n---\n📌 Si el problema persiste, recarga la página.', 'bot');
        }
    }

    chatSend.disabled = false;
});

function addMessage(text, sender, isWarning = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender === 'user' ? 'user-msg' : 'bot-msg'} ${isWarning ? 'warning-msg' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '☼';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    // Format the text with basic markdown-like formatting
    bubble.innerHTML = formatBotMessage(text);

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatBotMessage(text) {
    let html = text;

    // Horizontal rules ---
    html = html.replace(/^---$/gm, '<div class="chat-divider"></div>');

    // Headers ## and ###
    html = html.replace(/^### (.+)$/gm, '<h4 class="chat-h3">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="chat-h2">$1</h3>');

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Unordered lists: lines starting with "- "
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="chat-list">$1</ul>');

    // Paragraphs: double newlines
    html = html.replace(/\n\n/g, '</p><p>');

    // Single newlines (outside of already processed elements)
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = '<p>' + html + '</p>';

    // Clean empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[34])/g, '$1');
    html = html.replace(/(<\/h[34]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<div class="chat-divider">)/g, '$1');
    html = html.replace(/(<\/div>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');

    return html;
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-msg bot-msg';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="msg-avatar">☼</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingDiv;
}

function removeTyping(el) {
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}

// ---- INITIALIZATION ----
document.addEventListener('DOMContentLoaded', () => {
    setHeaderDate();
    loadNews();
    loadMarkets();
});
