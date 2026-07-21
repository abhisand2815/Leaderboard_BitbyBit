import os
import re
import csv
import urllib.request
import urllib.error
from collections import Counter, defaultdict
from flask import Flask, jsonify, request, render_template

app = Flask(__name__, static_folder='static', template_folder='templates')

# Global configuration store
config = {
    'sheet_url': 'https://docs.google.com/spreadsheets/d/103ZPLLnT3q1QP0LY7Gc_iWoeclZh89YQ5JE5a1F6eRQ/edit?resourcekey=&gid=806017816#gid=806017816',
    'name_column': None,       # None means auto-detect
    'sync_interval': 10,       # seconds
    'demo_mode': False,        # If true, forces mock data
    'data_source': 'google_sheet'  # 'google_sheet' or 'csv_upload'
}

# In-memory storage for manually uploaded CSV data
uploaded_data = None

# Rich mock dataset for demo mode or unauthorized states
MOCK_HEADERS = ["Timestamp", "Name", "Score", "Comments"]
MOCK_NAME_COLUMN = "Name"
MOCK_LEADERBOARD = [
    {
        'username': 'abhi726',
        'display_name': 'ABHI726',
        'count': 15,
        'rank': 1,
        'entries': [
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 10:00:00'},
            {'raw_casing': 'abhi726', 'timestamp': '2026-07-21 10:15:00'},
            {'raw_casing': 'Abhi726', 'timestamp': '2026-07-21 10:30:00'},
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 11:00:00'},
            {'raw_casing': 'abhi726', 'timestamp': '2026-07-21 11:45:00'},
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 12:00:00'},
            {'raw_casing': 'Abhi726', 'timestamp': '2026-07-21 13:20:00'},
            {'raw_casing': 'abhi726', 'timestamp': '2026-07-21 14:10:00'},
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 14:55:00'},
            {'raw_casing': 'abhi726', 'timestamp': '2026-07-21 15:30:00'},
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 16:10:00'},
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 16:45:00'},
            {'raw_casing': 'abhi726', 'timestamp': '2026-07-21 17:15:00'},
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 17:30:00'},
            {'raw_casing': 'ABHI726', 'timestamp': '2026-07-21 18:00:00'}
        ]
    },
    {
        'username': 'alex_coder',
        'display_name': 'Alex_Coder',
        'count': 11,
        'rank': 2,
        'entries': [
            {'raw_casing': 'Alex_Coder', 'timestamp': '2026-07-21 09:30:00'},
            {'raw_casing': 'alex_coder', 'timestamp': '2026-07-21 10:05:00'},
            {'raw_casing': 'Alex_Coder', 'timestamp': '2026-07-21 10:40:00'},
            {'raw_casing': 'alex_coder', 'timestamp': '2026-07-21 11:15:00'},
            {'raw_casing': 'Alex_Coder', 'timestamp': '2026-07-21 12:10:00'},
            {'raw_casing': 'Alex_Coder', 'timestamp': '2026-07-21 13:00:00'},
            {'raw_casing': 'alex_coder', 'timestamp': '2026-07-21 14:40:00'},
            {'raw_casing': 'Alex_Coder', 'timestamp': '2026-07-21 15:15:00'},
            {'raw_casing': 'Alex_Coder', 'timestamp': '2026-07-21 16:30:00'},
            {'raw_casing': 'alex_coder', 'timestamp': '2026-07-21 17:00:00'},
            {'raw_casing': 'Alex_Coder', 'timestamp': '2026-07-21 17:45:00'}
        ]
    },
    {
        'username': 'cryptoknight',
        'display_name': 'CryptoKnight',
        'count': 8,
        'rank': 3,
        'entries': [
            {'raw_casing': 'CryptoKnight', 'timestamp': '2026-07-21 08:45:00'},
            {'raw_casing': 'cryptoknight', 'timestamp': '2026-07-21 09:15:00'},
            {'raw_casing': 'CryptoKnight', 'timestamp': '2026-07-21 11:20:00'},
            {'raw_casing': 'CryptoKnight', 'timestamp': '2026-07-21 12:35:00'},
            {'raw_casing': 'cryptoknight', 'timestamp': '2026-07-21 13:50:00'},
            {'raw_casing': 'CryptoKnight', 'timestamp': '2026-07-21 15:00:00'},
            {'raw_casing': 'CryptoKnight', 'timestamp': '2026-07-21 16:05:00'},
            {'raw_casing': 'CryptoKnight', 'timestamp': '2026-07-21 17:20:00'}
        ]
    },
    {
        'username': 'skyler_dev',
        'display_name': 'Skyler_Dev',
        'count': 5,
        'rank': 4,
        'entries': [
            {'raw_casing': 'skyler_dev', 'timestamp': '2026-07-21 10:20:00'},
            {'raw_casing': 'Skyler_Dev', 'timestamp': '2026-07-21 11:30:00'},
            {'raw_casing': 'skyler_dev', 'timestamp': '2026-07-21 12:45:00'},
            {'raw_casing': 'Skyler_Dev', 'timestamp': '2026-07-21 14:15:00'},
            {'raw_casing': 'Skyler_Dev', 'timestamp': '2026-07-21 15:40:00'}
        ]
    },
    {
        'username': 'novajourney',
        'display_name': 'NovaJourney',
        'count': 5,
        'rank': 4,
        'entries': [
            {'raw_casing': 'NovaJourney', 'timestamp': '2026-07-21 10:10:00'},
            {'raw_casing': 'novajourney', 'timestamp': '2026-07-21 11:50:00'},
            {'raw_casing': 'NovaJourney', 'timestamp': '2026-07-21 13:05:00'},
            {'raw_casing': 'novajourney', 'timestamp': '2026-07-21 14:25:00'},
            {'raw_casing': 'NovaJourney', 'timestamp': '2026-07-21 16:00:00'}
        ]
    },
    {
        'username': 'emily_w',
        'display_name': 'Emily_W',
        'count': 3,
        'rank': 5,
        'entries': [
            {'raw_casing': 'emily_w', 'timestamp': '2026-07-21 09:50:00'},
            {'raw_casing': 'Emily_W', 'timestamp': '2026-07-21 12:15:00'},
            {'raw_casing': 'Emily_W', 'timestamp': '2026-07-21 15:10:00'}
        ]
    }
]

def make_csv_export_url(sheet_url):
    """Converts a standard edit Google Sheet URL to its CSV export equivalent."""
    # Extract Spreadsheet ID
    id_match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_url)
    if not id_match:
        raise ValueError("Invalid Google Sheets URL. Could not extract Spreadsheet ID.")
    spreadsheet_id = id_match.group(1)
    
    # Extract GID (sheet index) - defaults to 0 (first sheet)
    gid_match = re.search(r'[?&#]gid=([0-9]+)', sheet_url)
    gid = gid_match.group(1) if gid_match else "0"
    
    # Extract resourcekey if present
    rk_match = re.search(r'resourcekey=([a-zA-Z0-9-_]+)', sheet_url)
    resource_key_param = f"&resourcekey={rk_match.group(1)}" if rk_match and rk_match.group(1) else ""
    
    return f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid={gid}{resource_key_param}"

def auto_detect_name_column(headers):
    """Detects the column containing names/ids, ignoring timestamp-like fields."""
    if not headers:
        return None
    candidates = [h for h in headers if not re.search(r'timestamp|time|date', h, re.I)]
    if not candidates:
        return headers[0]
    
    # 1. Prioritize referral headers (e.g. 'Referral Name', 'Referrer')
    for c in candidates:
        if re.search(r'referral|referrer|referred', c, re.I):
            return c
            
    # 2. Prioritize headers containing terms like 'name', 'user', 'id', 'discord', 'handle'
    for c in candidates:
        if re.search(r'\b(name|username|id|discord|handle|user|roll|email|student)\b', c, re.I):
            return c
            
    # Fallback to the first non-timestamp column
    return candidates[0]

def process_leaderboard_data(rows, name_col):
    """Normalizes names case-insensitively, aggregates counts, and outputs dense ranks."""
    if not rows or not name_col:
        return []
        
    casing_counts = defaultdict(Counter)
    user_details = defaultdict(list)
    
    # Parse rows and group by normalized lowercase username
    for row in rows:
        raw_name = row.get(name_col, '').strip()
        if not raw_name:
            continue
            
        normalized = raw_name.lower()
        casing_counts[normalized][raw_name] += 1
        
        # Capture raw item details
        user_details[normalized].append(row)
        
    leaderboard = []
    for normalized, casings in casing_counts.items():
        total_count = sum(casings.values())
        # The most frequent casing used represents the display name
        display_name = casings.most_common(1)[0][0]
        
        # Build submission log
        entries = []
        for r in user_details[normalized]:
            # Locate timestamp value
            timestamp = ""
            for k, v in r.items():
                if re.search(r'timestamp|time|date', k, re.I):
                    timestamp = v
                    break
            entries.append({
                'raw_casing': r.get(name_col),
                'timestamp': timestamp,
                'raw_row': r
            })
            
        leaderboard.append({
            'username': normalized,
            'display_name': display_name,
            'count': total_count,
            'entries': sorted(entries, key=lambda x: x['timestamp'], reverse=True)
        })
        
    # Sort descending by count, then alphabetically by username
    leaderboard.sort(key=lambda x: (-x['count'], x['username']))
    
    # Compute dense ranks
    current_rank = 0
    prev_count = None
    for item in leaderboard:
        if item['count'] != prev_count:
            current_rank += 1
            prev_count = item['count']
        item['rank'] = current_rank
        
    return leaderboard

def fetch_and_parse_csv(url):
    """Fetches the Google Sheet exported CSV file and parses it into headers and rows."""
    csv_url = make_csv_export_url(url)
    req = urllib.request.Request(
        csv_url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    
    with urllib.request.urlopen(req, timeout=10) as response:
        content = response.read().decode('utf-8')
        
    # Parse CSV contents
    reader = csv.DictReader(content.splitlines())
    headers = reader.fieldnames if reader.fieldnames else []
    rows = list(reader)
    return headers, rows

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    global config
    if request.method == 'POST':
        data = request.json or {}
        if 'sheet_url' in data:
            config['sheet_url'] = data['sheet_url']
            config['name_column'] = None  # Reset detected column when URL changes
        if 'name_column' in data:
            config['name_column'] = data['name_column']
        if 'sync_interval' in data:
            try:
                config['sync_interval'] = max(3, int(data['sync_interval']))  # Min 3 seconds
            except ValueError:
                pass
        if 'demo_mode' in data:
            config['demo_mode'] = bool(data['demo_mode'])
        if 'data_source' in data:
            config['data_source'] = data['data_source']
            
        return jsonify({'status': 'success', 'config': config})
    else:
        return jsonify(config)

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    global config, uploaded_data
    
    # 1. Check Demo Mode
    if config.get('demo_mode'):
        return jsonify({
            'status': 'demo',
            'headers': MOCK_HEADERS,
            'name_column': config['name_column'] or MOCK_NAME_COLUMN,
            'data': MOCK_LEADERBOARD,
            'message': 'Running in Demo Mode.'
        })
        
    # 2. Check Local Uploaded CSV Mode
    if config['data_source'] == 'csv_upload':
        if not uploaded_data:
            return jsonify({
                'status': 'no_csv',
                'message': 'No CSV file has been uploaded yet. Please drop a file below.',
                'demo_data': MOCK_LEADERBOARD,
                'headers': MOCK_HEADERS,
                'name_column': MOCK_NAME_COLUMN
            })
            
        headers = uploaded_data['headers']
        rows = uploaded_data['rows']
        name_col = config.get('name_column') or auto_detect_name_column(headers)
        if name_col not in headers:
            name_col = auto_detect_name_column(headers)
            
        leaderboard_data = process_leaderboard_data(rows, name_col)
        return jsonify({
            'status': 'success',
            'headers': headers,
            'name_column': name_col,
            'data': leaderboard_data,
            'source': 'csv_upload'
        })
        
    # 3. Google Sheet Data Source Mode
    if not config.get('sheet_url'):
        return jsonify({
            'status': 'error',
            'message': 'Google Sheet URL has not been configured.',
            'demo_data': MOCK_LEADERBOARD,
            'headers': MOCK_HEADERS,
            'name_column': MOCK_NAME_COLUMN
        })
        
    try:
        headers, rows = fetch_and_parse_csv(config['sheet_url'])
        name_col = config.get('name_column') or auto_detect_name_column(headers)
        if name_col not in headers:
            name_col = auto_detect_name_column(headers)
            
        # Do not write the auto-detected name column permanently back into config['name_column']
        # to ensure it remains dynamic if they select "Auto-Detect Column" in settings.
        leaderboard_data = process_leaderboard_data(rows, name_col)
        
        return jsonify({
            'status': 'success',
            'headers': headers,
            'name_column': name_col,
            'data': leaderboard_data,
            'source': 'google_sheet'
        })
    except urllib.error.HTTPError as e:
        if e.code in [401, 403]:
            return jsonify({
                'status': 'unauthorized',
                'message': 'Access denied. The Google Sheet appears to be restricted.',
                'demo_data': MOCK_LEADERBOARD,
                'headers': MOCK_HEADERS,
                'name_column': MOCK_NAME_COLUMN
            }), 401
        else:
            return jsonify({
                'status': 'error',
                'message': f'HTTP Error {e.code} received from Google Sheets.',
                'demo_data': MOCK_LEADERBOARD,
                'headers': MOCK_HEADERS,
                'name_column': MOCK_NAME_COLUMN
            }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Connection failed: {str(e)}',
            'demo_data': MOCK_LEADERBOARD,
            'headers': MOCK_HEADERS,
            'name_column': MOCK_NAME_COLUMN
        }), 500

@app.route('/api/upload', methods=['POST'])
def upload_csv():
    global uploaded_data, config
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file element in request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No file selected'}), 400
        
    if file and file.filename.endswith('.csv'):
        try:
            content = file.read().decode('utf-8')
            reader = csv.DictReader(content.splitlines())
            headers = reader.fieldnames if reader.fieldnames else []
            rows = list(reader)
            
            uploaded_data = {
                'headers': headers,
                'rows': rows
            }
            
            config['data_source'] = 'csv_upload'
            config['demo_mode'] = False
            
            name_col = config.get('name_column') or auto_detect_name_column(headers)
            if name_col not in headers:
                name_col = auto_detect_name_column(headers)
            
            # Do not write the auto-detected name column permanently back into config['name_column']
            # to ensure it remains dynamic if they select "Auto-Detect Column" in settings.
            leaderboard_data = process_leaderboard_data(rows, name_col)
            
            return jsonify({
                'status': 'success',
                'headers': headers,
                'name_column': name_col,
                'data': leaderboard_data,
                'message': 'CSV uploaded successfully.'
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'Parsing error: {str(e)}'}), 500
    else:
        return jsonify({'status': 'error', 'message': 'File is not a valid CSV'}), 400

if __name__ == '__main__':
    # Runs the server locally on port 5000
    app.run(debug=True, port=5000)
