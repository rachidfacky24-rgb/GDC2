import os
import sqlite3
import uuid
from flask import Flask, g, jsonify, request, send_from_directory, abort
from flask_cors import CORS

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'data'))
DB_PATH = os.path.join(DATA_DIR, 'db.sqlite3')
SCHEMA_PATH = os.path.join(BASE_DIR, 'schema.sql')

os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__, static_folder=os.path.abspath(os.path.join(BASE_DIR, '..', 'static')))
CORS(app)

# Database helpers

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys = ON')
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    if not os.path.exists(DB_PATH):
        db = get_db()
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            db.executescript(f.read())
        db.commit()

# Utility

def make_purchase_row(row):
    return { 'id': row['id'], 'date': row['date'], 'total': row['total'] }

# API

@app.route('/api/ping')
def ping():
    return jsonify({'ok': True})

@app.route('/api/purchases', methods=['GET'])
def list_purchases():
    init_db()
    q = request.args.get('q', '').strip()
    order = request.args.get('order', 'desc')
    db = get_db()
    sql = 'SELECT id, date, total FROM purchases'
    args = []
    if q:
        sql += ' WHERE date LIKE ? OR id LIKE ? OR EXISTS (SELECT 1 FROM items i WHERE i.purchase_id = purchases.id AND lower(i.name) LIKE ?)'
        qpat = f"%{q.lower()}%"
        args.extend([q, q, qpat])
    sql += ' ORDER BY date ' + ('DESC' if order == 'desc' else 'ASC')
    cur = db.execute(sql, args)
    purchases = []
    rows = cur.fetchall()
    for r in rows:
        items_cur = db.execute('SELECT name, qty, price FROM items WHERE purchase_id = ?', (r['id'],))
        items = [ dict(x) for x in items_cur.fetchall() ]
        purchases.append({'id': r['id'], 'date': r['date'], 'total': r['total'], 'items': items})
    return jsonify(purchases)

@app.route('/api/purchases', methods=['POST'])
def create_purchase():
    init_db()
    data = request.get_json() or {}
    date = data.get('date')
    items = data.get('items')
    if not date or not items or not isinstance(items, list):
        return jsonify({'error':'date and items[] required'}), 400
    pid = str(uuid.uuid4())
    total = 0.0
    for it in items:
        try:
            qty = int(it.get('qty', 0))
            price = float(it.get('price', 0))
            total += qty * price
        except Exception:
            return jsonify({'error':'invalid item format'}), 400
    db = get_db()
    db.execute('INSERT INTO purchases (id, date, total) VALUES (?, ?, ?)', (pid, date, total))
    for it in items:
        db.execute('INSERT INTO items (purchase_id, name, qty, price) VALUES (?, ?, ?, ?)', (pid, it.get('name',''), int(it.get('qty',0)), float(it.get('price',0))))
    db.commit()
    return jsonify({'ok': True, 'id': pid}), 201

@app.route('/api/purchases/<pid>', methods=['DELETE'])
def delete_purchase(pid):
    init_db()
    db = get_db()
    cur = db.execute('SELECT 1 FROM purchases WHERE id = ?', (pid,))
    if cur.fetchone() is None:
        return jsonify({'error':'not found'}), 404
    db.execute('DELETE FROM purchases WHERE id = ?', (pid,))
    db.commit()
    return jsonify({'ok': True})

@app.route('/api/stats/total', methods=['GET'])
def stats_total():
    init_db()
    fr = request.args.get('from')
    to = request.args.get('to')
    db = get_db()
    sql = 'SELECT SUM(total) as total, COUNT(*) as count FROM purchases WHERE 1=1'
    args = []
    if fr:
        sql += ' AND date >= ?'
        args.append(fr)
    if to:
        sql += ' AND date <= ?'
        args.append(to)
    cur = db.execute(sql, args)
    row = cur.fetchone()
    return jsonify({'total': row['total'] or 0.0, 'count': row['count']})

@app.route('/api/stats/top-products', methods=['GET'])
def stats_top_products():
    init_db()
    limit = int(request.args.get('limit', 10))
    db = get_db()
    cur = db.execute("SELECT lower(name) as keyname, name, SUM(qty) as total_qty, SUM(qty*price) as spent FROM items GROUP BY keyname ORDER BY total_qty DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    out = [ {'name': r['name'], 'qty': r['total_qty'], 'spent': r['spent']} for r in rows ]
    return jsonify(out)

@app.route('/api/export', methods=['GET'])
def export_all():
    init_db()
    db = get_db()
    cur = db.execute('SELECT id, date, total FROM purchases ORDER BY date DESC')
    out = []
    for r in cur.fetchall():
        items_cur = db.execute('SELECT name, qty, price FROM items WHERE purchase_id = ?', (r['id'],))
        items = [ dict(x) for x in items_cur.fetchall() ]
        out.append({'id': r['id'], 'date': r['date'], 'total': r['total'], 'items': items})
    return jsonify(out)

@app.route('/api/import', methods=['POST'])
def import_all():
    init_db()
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({'error':'expected array'}), 400
    db = get_db()
    # replace existing data
    db.execute('DELETE FROM items')
    db.execute('DELETE FROM purchases')
    for p in data:
        pid = p.get('id', str(uuid.uuid4()))
        date = p.get('date')
        items = p.get('items', [])
        if not date:
            continue
        total = 0.0
        for it in items:
            total += int(it.get('qty',0)) * float(it.get('price',0))
        db.execute('INSERT INTO purchases (id, date, total) VALUES (?, ?, ?)', (pid, date, total))
        for it in items:
            db.execute('INSERT INTO items (purchase_id, name, qty, price) VALUES (?, ?, ?, ?)', (pid, it.get('name',''), int(it.get('qty',0)), float(it.get('price',0))))
    db.commit()
    return jsonify({'ok': True})

# Serve client
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # If path exists in static folder, let Flask's static handling do it
    if path.startswith('static/'):
        return app.send_static_file(path[len('static/'):])
    # default: send index
    root = os.path.abspath(os.path.join(BASE_DIR, '..'))
    return send_from_directory(root, 'index.html')

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)
