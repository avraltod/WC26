import { t } from './i18n.js';
import { applyWhatIf } from './whatif.js';
import { renderStandings, renderToday, renderSims, renderStats,
         renderPlayers, renderPathDetail, esc } from './render.js';

const TABS = [
  { id: 'today', render: () => renderToday(DATA, LIVE, hypo) },
  { id: 'standings', render: () => renderStandings(DATA) },
  { id: 'sims', render: () => renderSims(DATA, ODDS, PATHS) },
  { id: 'stats', render: () => renderStats(DATA) },
  { id: 'players', render: () => renderPlayers(DATA) },
];
let DATA, ODDS, PATHS, LIVE;
const hypo = {};   // matchNo -> [h, a]

async function fetchJson(name, optional = false) {
  try {
    const r = await fetch(`data/${name}?t=${Date.now()}`);
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    if (optional) return null;
    throw e;
  }
}

function currentTab() {
  const id = location.hash.replace('#', '');
  return TABS.find(x => x.id === id) ?? TABS[0];
}

function renderNav() {
  document.getElementById('tabs').innerHTML = TABS.map(x =>
    `<a href="#${x.id}" class="${x === currentTab() ? 'active' : ''}">${t(x.id)}</a>`).join('');
}

function renderView() {
  renderNav();
  document.getElementById('view').innerHTML = currentTab().render();
  if (currentTab().id === 'today') renderWhatIfTable();
  if (currentTab().id === 'sims') renderPath();
  document.getElementById('meta').textContent =
    `${t('updated')}: ${DATA.generated.slice(0, 16).replace('T', ' ')} UTC`;
}

function renderWhatIfTable() {
  const el = document.getElementById('whatif-table');
  if (!el) return;
  const ranked = applyWhatIf(DATA.players, hypo);
  el.innerHTML = `<table class="standings"><tbody>` + ranked.map(p => {
    const d = p.rankBefore - p.rankAfter;
    const arrow = d > 0 ? `<span class="up">▲${d}</span>`
                : d < 0 ? `<span class="down">▼${-d}</span>` : '—';
    const name = esc(p.codename_en);
    return `<tr><td>${p.rankAfter} ${arrow}</td><td class="who">${p.emoji} ${name}</td>
      <td class="num"><b>${p.total}</b>${p.gained ? ` <span class="up">+${p.gained}</span>` : ''}</td></tr>`;
  }).join('') + `</tbody></table>`;
}

function renderPath() {
  const sel = document.getElementById('path-player');
  const detail = document.getElementById('path-detail');
  if (sel && detail) {
    const update = () => { detail.innerHTML = renderPathDetail(PATHS, sel.value, DATA); };
    sel.onchange = update; update();
  }
}

document.addEventListener('click', e => {
  const step = e.target.dataset?.step;
  if (step) {
    const row = e.target.closest('.whatif-row');
    if (!row) return;
    const no = row.dataset.match;
    const goals = row.querySelector(`[data-goals="${step[0]}"]`);
    let v = Math.max(0, Math.min(9, +goals.textContent + (step[1] === '+' ? 1 : -1)));
    goals.textContent = v;
    const h = +row.querySelector('[data-goals="h"]').textContent;
    const a = +row.querySelector('[data-goals="a"]').textContent;
    hypo[no] = [h, a];
    renderWhatIfTable();
  }
  if (e.target.id === 'reset-whatif') {
    Object.keys(hypo).forEach(k => delete hypo[k]);
    renderView();
  }
});
window.addEventListener('hashchange', () => { if (DATA) renderView(); });

(async () => {
  [DATA, ODDS, PATHS, LIVE] = await Promise.all([
    fetchJson('data.json'), fetchJson('odds.json'),
    fetchJson('paths.json'), fetchJson('live.json', true)]);
  renderView();
  setInterval(async () => {                 // refresh live scores every 2 min
    LIVE = await fetchJson('live.json', true);
    if (currentTab().id === 'today') renderView();
  }, 120000);
})().catch(e => { console.error('[WC26]', e); document.getElementById('view').innerHTML = '<p>Error: data failed to load. Wait a moment, then refresh.</p>'; });
