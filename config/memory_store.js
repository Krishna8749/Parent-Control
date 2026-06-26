const crypto = require('crypto');

let useMemory = false;
let memData = {};

function checkMemory() {
  const url = process.env.SUPABASE_URL || '';
  useMemory = !url || url.includes('your-project');
  return useMemory;
}

function getTable(name) {
  if (!memData[name]) memData[name] = [];
  return memData[name];
}

class MemQuery {
  constructor(table) {
    this._table = table;
    this._type = null;
    this._data = null;
    this._updateData = null;
    this._filters = [];
    this._orExpr = null;
    this._orderCol = null;
    this._orderAsc = true;
    this._rangeFrom = null;
    this._rangeTo = null;
    this._limitN = null;
    this._single = false;
    this._count = false;
    this._head = false;
    this._onConflict = null;
    this._lastResult = null;
  }

  select(cols, opts) {
    if (this._type === 'insert' || this._type === 'upsert') {
      if (opts?.count === 'exact') this._count = true;
      if (opts?.head) this._head = true;
      return this;
    }
    this._type = 'select';
    if (opts?.count === 'exact') this._count = true;
    if (opts?.head) this._head = true;
    return this;
  }

  insert(data) {
    this._type = 'insert';
    this._data = data;
    const items = Array.isArray(data) ? data : [data];
    const table = getTable(this._table);
    const inserted = items.map(item => ({
      id: item.id || crypto.randomUUID(),
      ...item,
      created_at: item.created_at || new Date().toISOString(),
    }));
    table.push(...inserted);
    this._lastResult = inserted;
    return this;
  }

  update(data) {
    this._type = 'update';
    this._updateData = data;
    return this;
  }

  delete() {
    this._type = 'delete';
    return this;
  }

  upsert(data, opts) {
    this._type = 'upsert';
    this._data = data;
    this._onConflict = opts?.onConflict;
    const table = getTable(this._table);
    const items = Array.isArray(data) ? data : [data];
    const result = [];
    for (const item of items) {
      if (this._onConflict) {
        const parts = this._onConflict.split(',').map(s => s.trim());
        const idx = table.findIndex(r => parts.every(p => r[p] === item[p]));
        if (idx >= 0) {
          table[idx] = { ...table[idx], ...item };
          result.push(table[idx]);
        } else {
          const row = { id: item.id || crypto.randomUUID(), ...item, created_at: new Date().toISOString() };
          table.push(row);
          result.push(row);
        }
      } else {
        const row = { id: item.id || crypto.randomUUID(), ...item, created_at: new Date().toISOString() };
        table.push(row);
        result.push(row);
      }
    }
    this._lastResult = result;
    return this;
  }

  eq(col, val) { this._filters.push({ col, op: 'eq', val }); return this; }
  in(col, vals) { this._filters.push({ col, op: 'in', val: vals }); return this; }
  or(expr) { this._orExpr = expr; return this; }

  order(col, opts) {
    this._orderCol = col;
    this._orderAsc = opts?.ascending !== false;
    return this;
  }

  range(from, to) { this._rangeFrom = from; this._rangeTo = to; return this; }
  limit(n) { this._limitN = n; return this; }
  single() { this._single = true; return this; }

  then(resolve) {
    const result = this._exec();
    if (result instanceof Promise) result.then(resolve);
    else resolve(result);
  }

  _exec() {
    // If insert/upsert already ran and select() was chained after, return last result
    if ((this._type === 'insert' || this._type === 'upsert') && this._lastResult) {
      let rows = this._lastResult;
      if (this._single) return { data: rows[0] || null, error: rows[0] ? null : { code: 'PGRST116', message: 'Row not found' } };
      return { data: rows, error: null, count: rows.length };
    }

    // Update with select
    if (this._type === 'update' && this._updateData) {
      let rows = this._getFiltered();
      rows.forEach(r => Object.assign(r, this._updateData));
      if (this._single) return { data: rows[0] || null, error: rows[0] ? null : { code: 'PGRST116', message: 'Row not found' } };
      return { data: rows, error: null };
    }

    // Delete
    if (this._type === 'delete') {
      let rows = this._getFiltered();
      const ids = new Set(rows.map(r => r.id));
      const table = getTable(this._table);
      memData[this._table] = table.filter(r => !ids.has(r.id));
      return { data: null, error: null };
    }

    // Select
    let rows = this._getFiltered();

    if (this._orderCol) {
      rows.sort((a, b) => {
        const va = a[this._orderCol] || '';
        const vb = b[this._orderCol] || '';
        return this._orderAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
    }

    if (this._rangeFrom != null) rows = rows.slice(this._rangeFrom, this._rangeTo + 1);
    if (this._limitN != null) rows = rows.slice(0, this._limitN);

    if (this._count) {
      return { data: this._head ? null : rows, error: null, count: rows.length };
    }
    if (this._single) {
      return { data: rows[0] || null, error: rows[0] ? null : { code: 'PGRST116', message: 'Row not found' } };
    }
    return { data: rows, error: null, count: rows.length };
  }

  _getFiltered() {
    let rows = [...getTable(this._table)];
    for (const f of this._filters) {
      if (f.op === 'eq') rows = rows.filter(r => r[f.col] === f.val);
      else if (f.op === 'in') rows = rows.filter(r => f.val.includes(r[f.col]));
    }
    if (this._orExpr) {
      const parts = this._orExpr.split(',');
      rows = rows.filter(r => {
        return parts.some(p => {
          const match = p.match(/(\w+)\.ilike\.(.+)/);
          if (match) {
            const [, col, pattern] = match;
            const clean = pattern.replace(/%/g, '').toLowerCase();
            return String(r[col] || '').toLowerCase().includes(clean);
          }
          return false;
        });
      });
    }
    return rows;
  }
}

const supabase = { from: (table) => new MemQuery(table) };

module.exports = { supabase, checkMemory, useMemory: () => useMemory };
