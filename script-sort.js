// script-sort.js
// Ordenação de colunas para as tabelas: fixedExpensesTable, monthlyExpensesTable, installmentsTable
// Clique no cabeçalho para ordenar; novamente para inverter (asc/desc).
document.addEventListener('DOMContentLoaded', () => {
  const tableIds = ['fixedExpensesTable', 'monthlyExpensesTable', 'installmentsTable'];
  tableIds.forEach(id => setupTableSorting(id));
});

function setupTableSorting(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const ths = Array.from(table.querySelectorAll('thead th'));
  ths.forEach((th, index) => {
    const headerText = th.textContent.trim().toLowerCase();
    if (headerText === 'ações' || headerText === 'açõEs' || headerText === 'ações ') return; // não ordena coluna de ações
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const tbody = table.tBodies[0];
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      // Toggle order: se estava 'asc' -> virar 'desc', e vice-versa
      const currentOrder = th.dataset.order === 'desc' ? -1 : 1;
      const newOrder = currentOrder === 1 ? -1 : 1;
      const type = detectColumnType(headerText, rows, index);
      rows.sort((a, b) => compareRows(a, b, index, type, newOrder));
      // Reanexa as linhas na nova ordem
      rows.forEach(r => tbody.appendChild(r));
      // Atualiza indicadores visuais
      ths.forEach(h => { h.classList.remove('sort-asc', 'sort-desc'); h.dataset.order = ''; });
      th.classList.add(newOrder === 1 ? 'sort-asc' : 'sort-desc');
      th.dataset.order = newOrder === 1 ? 'asc' : 'desc';
    });
  });
}

function detectColumnType(headerText, rows, idx) {
  // Preferência por inferência do header
  if (headerText.includes('data')) return 'date';
  if (headerText.includes('valor')) return 'number';
  if (headerText.includes('parcela')) return 'installment';
  if (headerText.includes('nome') || headerText.includes('nome ')) return 'string';
  if (headerText.includes('forma') || headerText.includes('forma de pagamento')) return 'string';
  if (headerText.includes('categoria')) return 'string';
  // Se não foi possível pelo header, inferir por amostra de linhas
  for (const r of rows) {
    const cell = r.cells[idx];
    if (!cell) continue;
    const txt = cell.textContent.trim();
    if (!txt) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return 'date';        // YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(txt)) return 'date';      // dd/mm/YYYY
    if (/^\d+\s*\/\s*\d+/.test(txt)) return 'installment';    // 1/12
    if (/[Rr]?\$\s*[\d\.\,]+/.test(txt)) return 'number';     // R$ 1.234,56
    if (/^-?\d+(\,\d+)?$/.test(txt) || /^-?\d+(\.\d+)?$/.test(txt)) return 'number';
    return 'string';
  }
  return 'string';
}

function compareRows(a, b, idx, type, order) {
  const va = parseCell(a.cells[idx] ? a.cells[idx].textContent : '', type);
  const vb = parseCell(b.cells[idx] ? b.cells[idx].textContent : '', type);
  if (va < vb) return -1 * order;
  if (va > vb) return 1 * order;
  return 0;
}

function parseCell(text, type) {
  if (!text) return type === 'number' ? 0 : '';
  let s = text.trim();
  if (type === 'date') {
    // Suporta YYYY-MM-DD, dd/mm/YYYY e tentativas de parse genérico
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const t = Date.parse(s + 'T12:00:00');
      return isNaN(t) ? 0 : t;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const parts = s.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day, 12);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    // fallback: tentar Date.parse
    const t = Date.parse(s);
    return isNaN(t) ? 0 : t;
  }

  if (type === 'number') {
    // remove qualquer não-dígito exceto , e .
    // trata formatos BR: "R$ 1.234,56" -> 1234.56
    let cleaned = s.replace(/[^\d\-,.]/g, '');
    // remover pontos usados como separador de milhar (heurística)
    // substitui apenas pontos que aparecem antes de grupos de 3 dígitos
    cleaned = cleaned.replace(/\.(?=\d{3}(?:[^\d]|$))/g, '');
    const normalized = cleaned.replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  if (type === 'installment') {
    // Extrai "current/total" como número composto (prioriza parcela atual)
    const m = s.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      const current = parseInt(m[1], 10);
      const total = parseInt(m[2], 10);
      // Representa como float: current + total/10000 (ordena por current, desempata por total)
      return current + (total / 10000);
    }
    // Tenta extrair número caso o texto contenha valor
    const cleaned = s.replace(/[^\d\-,.]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? s.toLowerCase() : n;
  }

  // default: string, comparado em lowercase
  return s.toLowerCase();
}
