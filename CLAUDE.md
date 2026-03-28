# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **WeChat Mini-Program (微信小程序)** called "Yummy Map" (美食地图助手) for managing favorite restaurants on a map, paired with a **Node.js backend server** for data processing, OCR, and POI search.

- **Mini-program**: `/miniprogram/` - WeChat mini-program client
- **Server**: `/server/` - Node.js backend API server

## Development Commands

### Server (Node.js)

```bash
# Start development server (requires AMAP_WEB_API_KEY in .env)
cd server && npm run dev

# Run tests
npm test              # server tests
npm run test:api      # API tests
npm run test:e2e      # end-to-end tests
npm run test:all      # all tests

# Syntax check
npm run check
```

### Mini-program

Open `/miniprogram/` directory in **WeChat Developer Tools** (微信开发者工具).

- Local API URL: `http://127.0.0.1:3000`
- Configure API URL in `/miniprogram/config/env.js`
- For real device testing, set `useLanBaseUrl = true` and configure `lanBaseUrl` with your machine's LAN IP

## Architecture

### Server Architecture

Built with **vanilla Node.js HTTP** (no Express/Koa):

```
server/src/
├── index.js          # Main entry, route handlers
├── config.js         # Environment config
├── lib/
│   ├── db.js         # SQLite via sql.js, JSON storage
│   ├── http.js       # Request parsing, JSON response helpers
│   ├── errors.js     # AppError class
│   ├── id.js         # ID generation (prefix_timestamp_random)
│   └── async.js      # Utilities like sleep()
└── services/         # Business logic
    ├── import-service.js      # Import workflow (OCR → enrichment → favorites)
    ├── checkin-service.js     # Check-in CRUD operations
    ├── amap-service.js        # AMap POI search
    ├── paddle-ocr-service.js  # OCR text recognition
    └── upload-service.js      # Image upload handling
```

**Route Pattern**: Manual URL matching in `index.js`
- `request.method === "POST" && url.pathname === "/api/..."`
- Regex for parameterized routes: `/^\/api\/checkins\/[^/]+$/`

**Database Pattern**: SQLite (sql.js)
- Location: `data/yummy.db`
- All entity data stored as JSON strings in `data` column
- Manual persistence with `saveToDisk()` after writes
- Upsert pattern: `INSERT ... ON CONFLICT(id) DO UPDATE SET data = excluded.data`

### Mini-program Architecture

```
miniprogram/
├── app.js / app.json / app.wxss    # App entry and global config
├── config/env.js                    # API base URL configuration
├── utils/api.js                    # API client wrapper
├── pages/
│   ├── import/      # Upload images/text, start import
│   ├── preview/     # Review and select items
│   ├── map/         # Map view with markers (main feature)
│   ├── list/        # List view of favorites
│   └── profile/     # User profile with check-in history
└── components/      # Reusable components
    └── checkin-drawer/  # Check-in modal component
```

**API Client Pattern** (`/utils/api.js`):
- Promise-based wrapper around `wx.request`
- Each endpoint as a method returning `request({ url, method, data })`

**Page Pattern**:
- `index.js` - Page logic with `data` object and methods
- `index.wxml` - Template markup
- `index.wxss` - Component styles
- `index.json` - Page config (navigation bar title, component registration)

## Key Data Models

### Server Tables

**favorites**: Stores imported restaurant POIs
- `poi_id` (unique), `data` (JSON with name, rating, address, etc.)

**checkins**: Stores user check-ins
- `poi_id`, `rating` (1-5), `category`, `comment`, `images`
- Denormalized fields: `shop_name`, `city`, `address` for query efficiency

**imports**: Import sessions with async enrichment workflow

### Rating System (Check-ins)

| Rating | Label | Emoji | Color |
|--------|-------|-------|-------|
| 1 | 拉完了 | 😫 | #9E9E9E |
| 2 | NPC | 😐 | #78909C |
| 3 | 人上人 | 😊 | #66BB6A |
| 4 | 顶级 | 😍 | #FF7043 |
| 5 | 夯 | 🤩 | #FFCA28 |

## Environment Configuration

Server requires `.env` file:
```
PORT=3000
AMAP_WEB_API_KEY=your_key_here
DATABASE_PATH=data/yummy.db
```

Secrets are stored only on server side, never exposed to mini-program client.

## Git Workflow

- Feature branches: `feature/feature-name`
- Commit format: `<type>: <description>` (feat, fix, refactor, docs, test, chore)
