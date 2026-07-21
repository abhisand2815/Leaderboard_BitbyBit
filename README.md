# Real-Time Activity Leaderboard

A Flask web app that syncs live submission data from a Google Sheet (or an uploaded CSV), normalizes usernames case-insensitively, and displays rankings in a glassmorphic UI with a top-3 podium, live search, and per-user submission history.

## Features

- Syncs directly from a shared Google Sheet via CSV export, with a configurable auto-refresh interval
- Supports local CSV upload as an alternative data source
- Falls back to a demo dataset when no sheet is configured or access is denied
- Auto-detects the name/username column from sheet headers
- Merges case-variant spellings of the same username into a single entry
- Dense ranking (ties share a rank, no gaps)
- Top-3 podium with crown highlight for first place
- Live search across participants
- Details drawer showing casing variations and full submission timeline
- Animated list reordering as ranks change between syncs

## Tech Stack

- Backend: Python, Flask
- Frontend: HTML, CSS, vanilla JavaScript

## Installation

```bash
git clone https://github.com/abhisand2815/activity-leaderboard.git
cd activity-leaderboard
pip install flask
```

## Run

```bash
python app.py
```

App runs at `http://localhost:5000`.

## Configuration

Configured from the in-app Settings drawer:

| Setting | Description |
|---|---|
| Data Intake Mode | `google_sheet` or `csv_upload` |
| Google Sheets URL | Sheet ID, GID, and resource key are parsed automatically |
| Target Name Column | Column used for aggregation, or auto-detect |
| Auto-Sync Frequency | Polling interval in seconds (min 3) |
| Force Demo Mode | Serves mock data regardless of source |

To connect a real sheet: open **Share**, set access to **Anyone with the link can view**, and paste the URL into settings.

## API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/` | Serves the main UI |
| GET | `/api/config` | Returns current configuration |
| POST | `/api/config` | Updates configuration |
| GET | `/api/leaderboard` | Returns computed leaderboard data |
| POST | `/api/upload` | Uploads a CSV and switches the data source |

## Contact

Abhimanyu — [abhisand2815](https://github.com/abhisand2815) — abhimanyu15282005@gmail.com
