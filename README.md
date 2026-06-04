# Rescue Gran Prix

Version 1.0.0 of a browser racing EMT training game with a Node.js lobby server for shared race codes, live roster sync, shared questions, and multiplayer turn control.

## Website Shape

- Plain `HTML`, `CSS`, and `JavaScript`
- No framework
- No build step
- Node.js lobby backend for multiplayer sessions
- No framework or build step
- Static frontend served by the included server
- Local race state synchronized through the server API and live event stream

## Included

- Browser gameplay for two to eight drivers
- Human and AI drivers
- Shared lobby flow with race codes and player roster
- Joined players are automatically assigned to human driver slots
- Host-controlled setup, map, hazards, and race start
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
- Shared question, answer, review, standings, and race feed state
- Optional Raspberry Pi desktop widget for service and lobby administration

## Lobby Scope

Run the included Node server. It serves the static app and exposes same-origin APIs under `/api/lobbies`, plus a live stream at `/api/stream`, so phones, tablets, and laptops connected to the same server share race codes, lobby membership, setup, questions, answers, review state, and race progress.

## Question Source

The generated `questions.js` file contains 450 questions extracted from:

`almightyjoe/do-somethin`, branch `claude/trinidad-ems-training-app-81SVG`, under `prisma/question-banks`.

Only the question bank is used. Backend analytics, learner tracking, authentication, and database storage from the EMS training app are intentionally not included.

## Run Locally

Install Node.js 20 or newer, then start the server:

```powershell
npm start
```

The server starts at port `3040` by default. If that port is already in use, it automatically tries the next ports and prints the actual URL.

Then open the URL printed by the server. Common examples:

- Same computer: `http://127.0.0.1:3040/`
- Other devices on the same network: `http://COMPUTER_LAN_IP:3040/`

If other devices cannot connect, allow Node.js through the local firewall for private networks.

## Raspberry Pi 5 Hosting

The Pi hosts the entire system: static frontend files, question data, and lobby backend.

1. Install Node.js 20 or newer on the Pi.
2. Copy or clone this repository onto the Pi.
3. From the project directory, run `npm start`.
4. Visit `http://PI_IP_ADDRESS:3040/` from devices on the same network.

## Desktop Widget

The optional Raspberry Pi desktop widget lives in `desktop-widget/`. It can show service status, open the local app, list/delete races, kick players, clear stuck race state, and restart the service.

## Optional environment variables

- `PORT=3040` sets the first port to try.
- `PORT_ATTEMPTS=25` sets how many sequential ports the server may try before failing.
- `HOST=0.0.0.0` controls which network interface the server binds to.
- `LOBBY_TTL_MS=21600000` controls how long inactive lobbies stay listed.

This server keeps lobby state in memory. Restarting the Pi or server clears open lobbies, which is acceptable for race setup state. If the project later needs internet-scale availability, the same `/api/lobbies` contract can move to a persistent service such as Supabase, Firebase, Redis, or a hosted Node service.

## Internet Hosting

The production target is still one Raspberry Pi 5. The recommended internet-facing setup is to run the Node app and the HTTPS reverse proxy on that same Pi.

Do not expose the raw Node app directly as the public internet endpoint unless this is a temporary private test. Keep the app listening internally on `127.0.0.1:3040` or the Pi's LAN address, then put a reverse proxy in front of it if you need TLS.

Recommended home-hosted shape:

1. Point a domain or dynamic DNS hostname at your home IP.
2. Choose an available public port for your router and reverse proxy.
3. Forward that public port on the router to the Pi.
4. Run a reverse proxy such as Caddy or Nginx on the same Pi if TLS is required.
5. Proxy public traffic to `http://127.0.0.1:3040`.
6. Keep the Node app managed by `systemd` or another process supervisor.

Example Caddyfile:

```text
:YOUR_PUBLIC_PORT {
  reverse_proxy 127.0.0.1:3040
}
```

Example systemd service:

```ini
[Unit]
Description=Rescue Gran Prix
After=network.target

[Service]
WorkingDirectory=/opt/rescue-gran-prix
ExecStart=/usr/bin/npm start
Restart=always
Environment=HOST=127.0.0.1
Environment=PORT=3040

[Install]
WantedBy=multi-user.target
```

Scalability path:

- Home/LAN or small internet use: included Node server with in-memory lobbies.
- More reliable home hosting: add a small persistent store such as SQLite or Redis on the Pi.
- Internet-scale or mobile users across networks: move lobby state to Supabase Realtime, Firebase, Redis, or a hosted Node/WebSocket service while keeping the same frontend lobby API shape.

## GitHub Pages

This project can be published directly from the repository root on the `main` branch. It does not need server storage unless shared all-time high scores, online multiplayer, accounts, or centralized learner analytics are added later.
