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
- Nine selectable question sets:
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

## Question Source

The generated `questions.js` file contains 450 questions extracted from:

`almightyjoe/do-somethin`, branch `claude/trinidad-ems-training-app-81SVG`, under `prisma/question-banks`.

Only the question bank is used. Backend analytics, learner tracking, authentication, and database storage from the EMS training app are intentionally not included.

## Run Locally

Open `index.html` in a browser, or serve the folder with any static file server.

## GitHub Pages

This project can be published directly from the repository root on the `main` branch. It does not need server storage unless shared all-time high scores, online multiplayer, accounts, or centralized learner analytics are added later.
