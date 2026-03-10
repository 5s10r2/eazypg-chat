// ─── Comparison Card ───
import { escapeHtml } from '../helpers.js';
import { t } from '../i18n.js';
import { safeParse, safeParseInline } from '../sanitize.js';

export function buildCompareCardHtml(lines) {
  // Remove separator lines (---|---|---)
  const dataLines = lines.filter(l => !/^\s*\|?\s*[-:]+\s*[\|-]/.test(l));
  if (dataLines.length < 2) return lines.join('\n');

  const parsedRows = dataLines.map(l =>
    l.split('|').map(c => c.trim()).filter(c => c !== '')
  );

  const headerRow = parsedRows[0];
  const dataRows  = parsedRows.slice(1);

  // Separate winner row from data rows
  const isWinnerRow = r => r.join(' ').match(/🏆|best pick|pick:|recommended/i);
  const bodyRows  = dataRows.filter(r => !isWinnerRow(r));
  const winnerRow = dataRows.find(isWinnerRow);

  // renderCell: parse inline markdown (bold, italic) in header/cell text
  const renderCell = text => safeParseInline(text);

  // Find winner column index for highlight
  const winnerName = (winnerRow ? winnerRow.join(' ') : '').replace(/🏆|best pick:|pick:/gi, '').trim();
  const winnerColIdx = winnerName
    ? headerRow.findIndex(h => h.toLowerCase().includes(winnerName.toLowerCase().split(' ')[0]))
    : -1;

  const colHeaders = headerRow.map((h, i) =>
    `<th${i === winnerColIdx ? ' class="cmp-winner-col"' : ''}>${renderCell(h)}</th>`
  ).join('');

  // Pad rows to consistent column count
  const maxCols = Math.max(headerRow.length, ...bodyRows.map(r => r.length));

  const bodyHtml = bodyRows.map(row => {
    const paddedRow = [...row];
    while (paddedRow.length < maxCols) paddedRow.push('');
    const cells = paddedRow.map((c, ci) => {
      const lc = c.toLowerCase();
      let cls = ci === winnerColIdx ? 'cmp-winner-col' : '';
      if (['✓','yes','✅','✔'].includes(lc)) { cls += (cls ? ' ' : '') + 'cmp-yes'; c = '✓'; }
      if (['—','-','no','❌','✗'].includes(lc)) { cls += (cls ? ' ' : '') + 'cmp-no'; c = '—'; }
      return `<td class="${cls.trim()}">${cls.includes('cmp-yes') || cls.includes('cmp-no') ? escapeHtml(c) : renderCell(c)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const winnerHtml = winnerRow
    ? `<div class="compare-winner">🏆 ${escapeHtml(winnerRow.join(' · ').replace(/🏆|best pick:|pick:/gi, '').trim())}</div>`
    : '';

  return `<div class="compare-card">
    <div class="compare-card-header">${t("comparison_header")}</div>
    <div class="compare-tbl-wrap">
      <table class="compare-tbl">
        <thead><tr>${colHeaders}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
    ${winnerHtml}
  </div>`;
}

export function renderWithCompareTable(text) {
  const lines = text.split('\n');
  const segments = []; // {type:'text'|'table', content:string|string[]}
  let buf = [], tableBuf = [], inTable = false;

  for (const line of lines) {
    if (/\|.*\|/.test(line)) {
      if (!inTable && buf.length) {
        segments.push({ type: 'text', content: buf.join('\n') });
        buf = [];
      }
      inTable = true;
      tableBuf.push(line);
    } else {
      if (inTable) {
        if (tableBuf.length >= 3) segments.push({ type: 'table', content: tableBuf });
        else buf.push(...tableBuf);
        tableBuf = [];
        inTable = false;
      }
      buf.push(line);
    }
  }
  if (inTable && tableBuf.length >= 3) segments.push({ type: 'table', content: tableBuf });
  else if (tableBuf.length) buf.push(...tableBuf);
  if (buf.length) segments.push({ type: 'text', content: buf.join('\n') });

  const priceRe = /(₹[\d,]+(?:\s*(?:\/\s*(?:month|mo|day)))?)/g;
  const parts = [];
  for (const seg of segments) {
    if (seg.type === 'table') {
      parts.push({ html: buildCompareCardHtml(seg.content) });
    } else {
      let h = safeParse(seg.content);
      h = h.replace(priceRe, '<span class="price-inline">$1</span>');
      if (h.trim()) parts.push({ html: `<div class="msg-content">${h}</div>` });
    }
  }
  return parts;
}
