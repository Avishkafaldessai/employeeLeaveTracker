# Employee Leave Tracker (AngularJS + Node + SQLite)

Quick: ready-to-run demo that includes:
- AngularJS 1.x frontend with a calendar (FullCalendar) showing Indian holidays + applied leaves.
- Node.js + Express backend with SQLite (single-file `data.db`) storing leaves.
- Simple API: `GET /api/leaves`, `POST /api/leaves`, `GET /api/holidays`.

## How to run (short & straight)
1. Extract the ZIP.
2. Open terminal in the project folder.
3. Install dependencies:
   ```
   npm install
   ```
4. (Optional) Reinitialize DB:
   ```
   npm run init-db
   ```
5. Start the server:
   ```
   npm start
   ```
6. Open `http://localhost:3000` in your browser.

Server listens on port 3000 by default. `public/` contains frontend files (index.html, app.js, styles.css).

## Notes
- Holidays list is static in `/api/holidays` for demo. You can replace with live API.
- FullCalendar is loaded from CDN in `index.html`.
- To package further or deploy, consider using a proper database and authentication.

-- End