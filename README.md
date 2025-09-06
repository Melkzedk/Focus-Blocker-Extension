# Focus Blocker

A minimal Chrome extension to help you stay focused by blocking distracting websites during your chosen hours.

## How it works

- **Popup (React + Bootstrap):**  
  Lets you add/remove blocked domains, set which days and what time window to block, and enable/disable blocking.  
  All settings are managed in a simple, responsive UI.

- **Storage:**  
  Your settings are saved in `chrome.storage.sync`, so they automatically sync with your Chrome profile across devices.

- **Background Service Worker:**  
  Wakes up every minute using `chrome.alarms`, checks if the current time is within your focus schedule, and enables or disables blocking rules accordingly.  
  Blocking is enforced using Chrome's [declarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/), which redirects blocked sites to a friendly `blocked.html` page.

- **Blocked Page (`blocked.html`):**  
  Shows a clear message and offers a "Snooze 5 minutes" button.  
  Snoozing temporarily disables blocking by setting a `snoozeUntil` timestamp in storage.

## Features

- Block any list of domains you choose.
- Set which days of the week and what hours to block.
- One-click enable/disable.
- Snooze blocking for 5 minutes from the blocked page.
- All logic runs locally—no data leaves your browser.

## Development

- **Stack:** React, Vite, Bootstrap, Chrome Extensions MV3.
- **Popup UI:** [`src/App.jsx`](src/App.jsx)
- **Service Worker:** [`public/service-worker.js`](public/service-worker.js)
- **Blocked Page:** [`public/blocked.html`](public/blocked.html), [`public/blocked.css`](public/blocked.css)
- **Manifest:** [`public/manifest.json`](public/manifest.json)

### Scripts

- `npm run dev` — Start development server (popup UI)
- `npm run build` — Build for production
- `npm run lint` — Lint code

## Installation

1. Run `npm run build` to generate the `dist/` folder.
2. In Chrome, go to `chrome://extensions`, enable "Developer mode", and "Load unpacked" with the `dist/` folder.
3. Pin the extension and open the popup to configure your focus schedule.

---
