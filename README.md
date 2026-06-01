# Rescue Gran Prix

Standalone static website that merges the Math Gran Prix racing shell with the Trinidad EMS training question banks.

## Website Shape

- Plain `HTML`, `CSS`, and `JavaScript`
- No framework
- No build step
- No backend service
- GitHub Pages compatible
- Results are kept only for the current browser session

## Included

- Local browser gameplay for two to four drivers
- Human and AI drivers
- Browser-side lobby flow with race codes, player roster, and ready checks
- Configuration changes reset player readiness before the race can start
- EMT multiple-choice questions from the Trinidad EMS training app
- Ten selectable question sets:
  - All Questions
  - Pharmacology & Oxygen
  - Respiratory Emergencies
  - Neurology & Stroke
  - Diabetic Emergencies
  - Anaphylaxis
  - Toxicology & Poisoning
  - Obstetric & Neonatal
  - Paediatric Emergencies
  - EMS Operations
- Eight selectable SVG race maps with distinct scenery
- Randomized hazard placement and hazard types on the selected map
- Session-only final standings

## Lobby Scope

When opened from GitHub Pages or a local file, the lobby registry is stored in each browser's local storage. Race codes and available races are visible across tabs/windows on the same device, but not across separate devices.

For cross-device play, run the included Node server. It serves the same static files and exposes a same-origin lobby API at `/api/lobbies`, so phones, tablets, and laptops connected to the same server share race codes, lobby membership, and ready state.

## Question Source

The generated `questions.js` file contains 450 questions extracted from:

`almightyjoe/do-somethin`, branch `claude/trinidad-ems-training-app-81SVG`, under `prisma/question-banks`.

Only the question bank is used. Backend analytics, learner tracking, authentication, and database storage from the EMS training app are intentionally not included.

## Run Locally

Open `index.html` in a browser, or serve the folder with any static file server.

For cross-device lobby testing on a LAN:

```powershell
npm start
```

Then open `http://SERVER_IP:8080/` from each device.

## Raspberry Pi 5 Hosting

1. Install Node.js 20 or newer on the Pi.
2. Copy or clone this repository onto the Pi.
3. From the project directory, run `npm start`.
4. Visit `http://PI_IP_ADDRESS:8080/` from devices on the same network.

Optional environment variables:

- `PORT=8080` changes the server port.
- `HOST=0.0.0.0` controls which network interface the server binds to.
- `LOBBY_TTL_MS=21600000` controls how long inactive lobbies stay listed.

This server keeps lobby state in memory. Restarting the Pi or server clears open lobbies, which is acceptable for race setup state. If the project later needs internet-scale availability, the same `/api/lobbies` contract can move to a persistent service such as Supabase, Firebase, Redis, or a hosted Node service.

## GitHub Pages

This project can be published directly from the repository root on the `main` branch. It does not need server storage unless shared all-time high scores, online multiplayer, accounts, or centralized learner analytics are added later.
