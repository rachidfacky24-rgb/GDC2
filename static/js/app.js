// Client utilisant l'API backend si disponible
let purchases = [];
const API_BASE = '';

async function apiGet(path){
  const res = await fetch(API_BASE + path);
  if(!res.ok) throw new Error('API error');
  return res.json();
}

async function apiPost(path, body){
  const res = await fetch(API_BASE + path, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  if(!res.ok) throw new Error('API error');
  return res.json();
}

async function apiDelete(path){
  const res = await fetch(API_BASE + path, {method:'DELETE'});
  if(!res.ok) throw new Error('API error');
  return res.json();
}

async function loadData(){
  try{
    purchases = await apiGet('/api/purchases?order=desc');
  }catch(err){
    console.warn('API not available, falling back to localStorage');
    const raw = localStorage.getItem('courses-db');
    purchases = raw ? JSON.parse(raw) : [];
  }
}

async function saveRemote(purchase){
  try{ await apiPost('/api/purchases', purchase); await loadData(); renderAll(); }
  catch(err){
    // fallback: local
    const raw = localStorage.getItem('courses-db');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({id: Date.now().toString(36), ...purchase, total: purchase.items.reduce((s,i)=> s + (i.qty * i.price), 0)});
    localStorage.setItem('courses-db', JSON.stringify(arr));
    await loadData(); renderAll();
  }
}

async function removePurchase(id){
  try{ await apiDelete('/api/purchases/' + id); }
  catch(err){
    // fallback to local
    const raw = localStorage.getItem('courses-db');
    let arr = raw ? JSON.parse(raw) : [];
    arr = arr.filter(p=> p.id !== id);
    localStorage.setItem('courses-db', JSON.stringify(arr));
  }
  await loadData(); renderAll();
}

async function computeTotals(from, to){
  try{
    const url = `/api/stats/total?${from?('from='+from+'&') : ''}${to?('to='+to) : ''}`;
    return await apiGet(url);
  }catch(err){
    // local compute
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    const filtered = purchases.filter(p=>{
      const d = new Date(p.date);
      if(f && d < f) return false;
      if(t && d > t) return false;
      return true;
    });
    const total = filtered.reduce((s,p)=> s + (p.total || p.items.reduce((ss,i)=> ss + i.qty*i.price, 0)), 0);
    return {total, count: filtered.length};
  }
}

async function topProducts(topN=5){
  try{
    return await apiGet('/api/stats/top-products?limit=' + topN);
  }catch(err){
    const map = new Map();
    purchases.forEach(p => p.items.forEach(i=>{
      const key = i.name.toLowerCase().trim();
      const prev = map.get(key) || {name: i.name, qty:0, spent:0};
      prev.qty += Number(i.qty);
      prev.spent += Number(i.qty)*Number(i.price);
      map.set(key, prev);
    }));
    return Array.from(map.values()).sort((a,b)=> b.qty - a.qty).slice(0,topN);
  }
}

// Rendering
function renderHistory(filterText='', order='desc'){
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  let data = [...purchases];
  if(filterText){
    const q = filterText.toLowerCase();
    data = data.filter(p=> p.items.some(i=> i.name.toLowerCase().includes(q)) || p.date.includes(q));
  }
  data.sort((a,b)=> order === 'desc' ? new Date(b.date)-new Date(a.date) : new Date(a.date)-new Date(b.date));

  if(data.length === 0){ list.innerHTML = '<p class="text-muted">Aucun achat</p>'; return; }

  data.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'mb-3 p-2 border rounded';
    let html = `<div class="d-flex justify-content-between align-items-start">`;
    html += `<div><strong>${p.date}</strong><br>`;
    html += p.items.map(i=> `${i.name} — x${i.qty} @ ${Number(i.price).toFixed(2)} €`).join('<br>');
    html += `</div><div><strong>${(p.total||p.items.reduce((ss,i)=> ss + i.qty*i.price,0)).toFixed(2)} €</strong><br><button class="btn btn-sm btn-danger btn-delete" data-id="${p.id}">Supprimer</button></div></div>`;
    div.innerHTML = html;
    list.appendChild(div);
  });

  // attach delete handlers
  list.querySelectorAll('.btn-delete').forEach(b=> b.addEventListener('click', async e=>{
    const id = e.target.dataset.id;
    if(confirm('Supprimer cet achat ?')) await removePurchase(id);
  }));
}

async function renderTopProducts(){
  const top = await topProducts(10);
  const ul = document.getElementById('topProducts');
  ul.innerHTML = '';
  if(top.length === 0){ ul.innerHTML = '<li class="list-group-item text-muted">Aucun produit</li>'; return; }
  top.forEach(t => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<div>${t.name}</div><span class="badge bg-primary rounded-pill">${t.qty}</span>`;
    ul.appendChild(li);
  });
}

let chart = null;
async function renderChart(){
  // dépenses par mois
  const map = new Map();
  purchases.forEach(p=>{
    const d = new Date(p.date);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    map.set(key, (map.get(key)||0) + (p.total || p.items.reduce((ss,i)=> ss + i.qty*i.price, 0)));
  });
  const labels = Array.from(map.keys()).sort();
  const data = labels.map(l=> map.get(l));
  const ctx = document.getElementById('expensesChart');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Dépenses', data, backgroundColor: 'rgba(13,110,253,0.7)'}] },
    options: { responsive:true, maintainAspectRatio:false }
  });
}

async function renderTotalsDisplay(from=null,to=null){
  const res = await computeTotals(from,to);
  document.getElementById('totalAmount').textContent = Number(res.total || 0).toFixed(2) + ' €';
}

async function renderAll(){
  await loadData();
  renderHistory(document.getElementById('search').value, document.getElementById('sortOrder').value);
  await renderTopProducts();
  await renderChart();
}

// UI helpers
function createItemRow(){
  const div = document.createElement('div');
  div.className = 'item-row row g-2 align-items-end mb-2';
  div.innerHTML = `
    <div class="col-5"><input class="form-control product-name" type="text" placeholder="Nom" required></div>
    <div class="col-3"><input class="form-control product-qty" type="number" min="1" value="1" required></div>
    <div class="col-3"><input class="form-control product-price" type="number" min="0" step="0.01" value="0.00" required></div>
    <div class="col-1"><button type="button" class="btn btn-danger btn-remove-item">×</button></div>
  `;
  div.querySelector('.btn-remove-item').addEventListener('click', ()=> div.remove());
  return div;
}

// Events
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadData();
  // ensure at least one row
  if(!document.querySelector('#itemsContainer .item-row')){
    document.getElementById('itemsContainer').appendChild(createItemRow());
  }

  document.getElementById('addItem').addEventListener('click', (e)=>{ e.preventDefault(); document.getElementById('itemsContainer').appendChild(createItemRow()); });

  // remove button on initial row
  document.querySelectorAll('.btn-remove-item').forEach(b=> b.addEventListener('click', e=> e.target.closest('.item-row').remove()));

  document.getElementById('purchaseForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
    const rows = Array.from(document.querySelectorAll('#itemsContainer .item-row'));
    const items = rows.map(r=>({
      name: r.querySelector('.product-name').value.trim(),
      qty: Number(r.querySelector('.product-qty').value),
      price: Number(r.querySelector('.product-price').value)
    })).filter(i=> i.name && i.qty>0);
    if(items.length === 0){ alert('Ajoutez au moins un produit valide'); return; }
    await saveRemote({date, items});
    // reset form
    document.getElementById('purchaseForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    document.getElementById('itemsContainer').appendChild(createItemRow());
  });

  document.getElementById('search').addEventListener('input', async ()=> renderHistory(document.getElementById('search').value, document.getElementById('sortOrder').value));
  document.getElementById('sortOrder').addEventListener('change', async ()=> renderHistory(document.getElementById('search').value, document.getElementById('sortOrder').value));

  document.getElementById('computeTotals').addEventListener('click', async ()=>{
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    await renderTotalsDisplay(from||null,to||null);
  });

  document.getElementById('clearData').addEventListener('click', async ()=>{
    if(confirm('Supprimer toutes les données locales ?')){ localStorage.removeItem('courses-db'); await fetch('/api/import', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify([])}).catch(()=>{}); await loadData(); renderAll(); }
  });

  document.getElementById('exportJson').addEventListener('click', async ()=>{
    try{
      const data = await apiGet('/api/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'courses-export.json'; a.click(); URL.revokeObjectURL(url);
    }catch(err){
      // fallback local
      const raw = localStorage.getItem('courses-db');
      const blob = new Blob([raw || '[]'], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'courses-export.json'; a.click(); URL.revokeObjectURL(url);
    }
  });

  document.getElementById('importFile').addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      try{ const imported = JSON.parse(reader.result); if(Array.isArray(imported)){ await fetch('/api/import', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(imported)}); alert('Import OK'); await loadData(); renderAll(); } else alert('Fichier invalide'); }
      catch(err){ alert('Erreur de lecture du fichier'); }
    };
    reader.readAsText(f);
  });

  await renderAll();
});