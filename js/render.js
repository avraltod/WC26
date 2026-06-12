import { t } from './i18n.js';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const codename = p => p.codename_en;
const teamCode = (D, team) => D.team_codes?.[team] ?? team;
const flagImg = (D, team) => D.flags[team]
  ? `<img class="flag" alt="" src="https://flagcdn.com/24x18/${D.flags[team].toLowerCase()}.png">`
  : '';
const byRank = D => [...D.players]; // build.py already sorts by rank

export function sparkline(ranks, n) {
  if (!ranks.length) return '';
  const w = 80, h = 24, max = n, pts = ranks.map((r, i) =>
    `${(i / Math.max(1, ranks.length - 1)) * w},${((r - 1) / Math.max(1, max - 1)) * h}`);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

export function renderStandings(D) {
  const n = D.players.length;
  const rows = byRank(D).map((p, i) => `
    <tr data-player="${esc(p.id)}">
      <td>${i + 1}</td><td class="who">${p.emoji} ${esc(codename(p))}</td>
      <td class="num"><b>${p.total}</b></td>
      <td class="num">${p.n3}·${p.n2}·${p.n1}</td>
      <td>${sparkline(p.rank_history, n)}</td>
    </tr>`).join('');
  return `<table class="standings"><thead><tr>
    <th>${t('rank')}</th><th></th><th>${t('total')}</th><th>${t('dist')}</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderToday(D, live, hypo = {}) {
  const upcoming = D.matches.filter(m => !m.played);
  const liveStamp = live?.fetched_at ? ` · ${esc(live.fetched_at.slice(11, 16))} UTC` : '';
  const liveRows = (live?.matches ?? []).map(m =>
    `<div class="match live"><span>${flagImg(D, m.home)} ${esc(teamCode(D, m.home))}</span>
     <b>${m.score?.[0] ?? '–'} : ${m.score?.[1] ?? '–'}</b>
     <span>${esc(teamCode(D, m.away))} ${flagImg(D, m.away)}</span>
     <em>${m.status}</em></div>`).join('');
  const steppers = upcoming.map(m => {
    const [hg, ag] = hypo[m.no] ?? [0, 0];
    return `
    <div class="match whatif-row" data-match="${m.no}">
      <span>${flagImg(D, m.home)} ${esc(teamCode(D, m.home))}</span>
      <span class="stepper">
        <button data-step="h-">−</button><b data-goals="h">${hg}</b><button data-step="h+">+</button>
        :
        <button data-step="a-">−</button><b data-goals="a">${ag}</b><button data-step="a+">+</button>
      </span>
      <span>${esc(teamCode(D, m.away))} ${flagImg(D, m.away)}</span>
    </div>`;
  }).join('');
  const podium = byRank(D).slice(0, 3).map((p, i) =>
    `<div class="podium p${i + 1}">${['🥇', '🥈', '🥉'][i]} ${p.emoji} ${esc(codename(p))} <b>${p.total}</b></div>`).join('');
  return `<div class="podium-row">${podium}</div>
    ${liveRows ? `<h3>${t('live')}${liveStamp}</h3>${liveRows}` : ''}
    <div class="whatif-layout">
      <section class="whatif-panel">
        <h3>${t('whatif')}</h3>
        <div class="whatif-list">${steppers || `<p>${t('upcoming')}: —</p>`}</div>
        <button id="reset-whatif">${t('reset')}</button>
      </section>
      <section class="whatif-panel">
        <h3>Results</h3>
        <div id="whatif-table"></div>
      </section>
    </div>`;
}

export function renderSims(D, ODDS, PATHS) {
  const rows = byRank(D).map(p => {
    const o = ODDS[p.id] ?? { win_pct: 0, top3_pct: 0, exp_pts: p.total };
    return `<tr><td class="who">${p.emoji} ${esc(codename(p))}</td>
      <td class="num">${o.win_pct}%</td><td class="num">${o.top3_pct}%</td>
      <td class="num">${o.exp_pts}</td>
      <td><div class="bar" style="width:${o.win_pct}%"></div></td></tr>`;
  }).join('');
  const pathSel = byRank(D).map(p =>
    `<option value="${esc(p.id)}">${p.emoji} ${esc(codename(p))}</option>`).join('');
  return `<table class="odds"><thead><tr><th></th><th>${t('win_odds')}</th>
    <th>${t('top3')}</th><th>${t('exp_pts')}</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
    <h3>${t('path_to_victory')}</h3>
    <select id="path-player">${pathSel}</select>
    <div id="path-detail"></div>`;
}

export function renderPathDetail(PATHS, playerId, D = null) {
  const p = PATHS[playerId] ?? { helps: [], hurts: [] };
  const label = d => D ? d.label.replace(/\{([^}]+)\}/g, (_, team) => teamCode(D, team)) : d.label;
  const li = d => `<li>${esc(label(d))}: <b>${d.delta > 0 ? '+' : ''}${d.delta}%</b></li>`;
  return `<h4>${t('helps')}</h4><ul>${p.helps.map(li).join('') || '<li>—</li>'}</ul>
          <h4>${t('hurts')}</h4><ul>${p.hurts.map(li).join('') || '<li>—</li>'}</ul>`;
}

export function renderStats(D) {
  const exact = byRank(D).map(p =>
    `<tr><td class="who">${p.emoji} ${esc(codename(p))}</td><td class="num">${p.n3}</td></tr>`).join('');
  const ai = D.players.find(p => p.id === 'ai');
  const humans = D.players.filter(p => p.id !== 'ai');
  const beatAi = ai ? humans.filter(h => h.total > ai.total).length : 0;
  return `${ai ? `<h3>${t('vs_ai')}</h3>
    <p>🤖 ${ai.total} — ${beatAi}/${humans.length} 🧑</p>` : ''}
    <h3>${t('exact')}</h3><table><tbody>${exact}</tbody></table>`;
}

export function renderPlayers(D) {
  return byRank(D).map(p => `
    <div class="player-card" data-player="${esc(p.id)}">
      <div class="big">${p.emoji}</div>
      <h3>${esc(codename(p))}</h3><p class="meaning">${esc(p.meaning_en)}</p>
      <p>${t('total')}: <b>${p.total}</b> (${p.n3}×3, ${p.n2}×2, ${p.n1}×1)</p>
      ${p.top4.length ? `<p>${t('top4')}: ${p.top4.map(tm => `${flagImg(D, tm)} ${esc(teamCode(D, tm))}`).join(' → ')}</p>` : ''}
      ${sparkline(p.rank_history, D.players.length)}
    </div>`).join('');
}
