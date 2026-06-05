(function () {
  "use strict";

  const TRACK_LENGTH = 30;
  const FINISH_INDEX = TRACK_LENGTH - 1;
  const FIRST_CROSSING_INDEX = 6;
  const MAX_PLAYERS = 8;
  const MOVE_OPTIONS = [1, 2, 3];
  const DIFFICULTY_POINTS = [1, 2, 3, 4, 5];
  const PLACEMENT_BONUS = [15, 8, 4, 0];
  const HAZARD_KEYS = ["spinner", "skipper", "sinker", "steps", "oil", "redflag"];
  const LOBBY_STORAGE_KEY = "rescue-gran-prix-lobbies-v1";
  const CLIENT_ID_STORAGE_KEY = "rescue-gran-prix-client-id-v1";
  const LOBBY_API_URL = "./api/lobbies";
  const LOBBY_STREAM_URL = "./api/stream";
  const APP_META = {
    release: "1.0.0",
    revision: "working",
    updatedOn: "2026-06-04",
    label: "Remote multiplayer build",
    note: "Questions, answers, and review state are shared across both racers.",
  };
  const HAZARD_INFO = {
    spinner: {
      label: "Spinner",
      short: "S",
      color: "#ffd96b",
      effect: "Jump 1-4 extra spaces.",
      icon: "star",
    },
    skipper: {
      label: "Skipper",
      short: "K",
      color: "#7fd3ff",
      effect: "Take another turn.",
      icon: "flag",
    },
    sinker: {
      label: "Sinker",
      short: "N",
      color: "#bb9ae6",
      effect: "Gain one bump shield.",
      icon: "shield",
    },
    steps: {
      label: "Steps",
      short: "T",
      color: "#ffb057",
      effect: "Only 3-space moves until the finish.",
      icon: "stairs",
    },
    oil: {
      label: "Oil Slick",
      short: "O",
      color: "#8d98ad",
      effect: "Slide 2 spaces, then lose your next turn in the grass.",
      icon: "oil",
    },
    redflag: {
      label: "Red Flag",
      short: "R",
      color: "#e56b64",
      effect: "Lose your next turn.",
      icon: "redflag",
    },
  };

  const PLAYER_STYLES = [
    { name: "Red Car", color: "#cd4f49" },
    { name: "Blue Car", color: "#3b6fc7" },
    { name: "Green Car", color: "#4f9b55" },
    { name: "Orange Car", color: "#db8a35" },
  ];

  const COURSE_MODULES = [
    { slug: "all", name: "All Questions", all: true },
    { slug: "pharmacology-emt", name: "Pharmacology & Oxygen" },
    { slug: "respiratory-emergencies", name: "Respiratory Emergencies" },
    { slug: "neurology-stroke", name: "Neurology & Stroke" },
    { slug: "diabetic-emergencies", name: "Diabetic Emergencies" },
    { slug: "anaphylaxis", name: "Anaphylaxis" },
    { slug: "toxicology-poisoning", name: "Toxicology & Poisoning" },
    { slug: "obstetric-neonatal", name: "Obstetric & Neonatal" },
    { slug: "paediatric-emergencies", name: "Paediatric Emergencies" },
    { slug: "ems-operations", name: "EMS Operations" },
  ];

  const MODE_NAMES = Object.fromEntries(COURSE_MODULES.map((module, index) => [index + 1, module.name]));

  const TRACK_LAYOUTS = {
    classic: { name: "Harbor Dash", family: "classic", world: "harbor" },
    overpass: { name: "Skyline Overpass", family: "overpass", world: "city" },
    switchback: { name: "Pine Switchback", family: "switchback", world: "forest" },
    lagoon: { name: "Lagoon Loop", family: "lagoon", world: "harbor" },
    canyon: { name: "Canyon Spiral", family: "canyon", world: "canyon" },
    speedway: { name: "Speedway Oval", family: "speedway", world: "city" },
    summit: { name: "Summit Climb", family: "summit", world: "forest" },
    nebula: { name: "Nebula Eight", family: "nebula", world: "space" },
  };

  const TRACK_LIBRARY = {
    classic: [
      createTemplate(
        "classic-a",
        [
          [92, 474], [164, 474], [236, 474], [308, 474], [380, 474], [452, 474], [524, 474],
          [596, 474], [668, 474], [740, 474], [812, 474], [884, 474], [956, 474],
          [956, 382], [956, 290], [956, 198], [884, 198], [812, 198], [740, 198], [668, 198],
          [596, 198], [524, 198], [452, 198], [380, 198], [308, 198], [236, 198], [164, 198], [92, 198], [92, 122], [92, 68],
        ],
        [6, 12, 18, 24],
        [
          { from: 0, to: 12, lanes: 2 },
          { from: 12, to: 15, lanes: 1 },
          { from: 15, to: 27, lanes: 2 },
          { from: 27, to: 29, lanes: 1 },
        ],
        [8, 9, 10, 13, 14, 19, 20, 21, 25, 26]
      ),
      createTemplate(
        "classic-b",
        [
          [100, 470], [176, 470], [252, 470], [328, 470], [404, 470], [480, 470], [556, 470],
          [632, 470], [708, 470], [784, 470], [860, 470], [936, 470], [992, 424],
          [992, 340], [992, 256], [948, 182], [872, 160], [796, 160], [720, 160], [644, 160],
          [568, 160], [492, 160], [416, 160], [340, 160], [264, 160], [188, 160], [112, 160], [84, 232], [84, 320], [84, 408],
        ],
        [6, 12, 18, 24],
        [
          { from: 0, to: 11, lanes: 2 },
          { from: 11, to: 15, lanes: 1 },
          { from: 15, to: 26, lanes: 2 },
          { from: 26, to: 29, lanes: 1 },
        ],
        [7, 8, 10, 13, 16, 17, 20, 21, 25, 27]
      ),
    ],
    overpass: [
      createTemplate(
        "overpass-a",
        [
          [92, 456], [132, 392], [190, 354], [256, 338], [322, 330], [394, 314], [466, 276],
          [534, 238], [604, 226], [678, 244], [750, 286], [818, 338], [874, 378],
          [930, 352], [968, 288], [948, 216], [892, 168], [820, 134], [740, 120], [656, 126],
          [574, 150], [500, 178], [428, 176], [354, 154], [278, 142], [204, 154], [142, 192], [104, 256], [92, 332], [92, 404],
        ],
        [6, 12, 18, 24],
        [
          { from: 0, to: 6, lanes: 1 },
          { from: 6, to: 12, lanes: 2 },
          { from: 12, to: 16, lanes: 1 },
          { from: 16, to: 24, lanes: 2 },
          { from: 24, to: 29, lanes: 1 },
        ],
        [7, 8, 10, 13, 14, 19, 20, 23, 25, 27]
      ),
      createTemplate(
        "overpass-b",
        [
          [106, 452], [164, 420], [236, 398], [318, 384], [398, 380], [474, 364], [546, 330],
          [620, 294], [700, 286], [780, 308], [854, 348], [918, 394], [970, 392],
          [988, 322], [970, 252], [928, 192], [864, 152], [788, 130], [706, 124], [620, 134],
          [538, 156], [460, 184], [386, 196], [314, 178], [242, 146], [176, 134], [126, 178], [100, 244], [94, 322], [98, 394],
        ],
        [6, 12, 18, 24],
        [
          { from: 0, to: 5, lanes: 1 },
          { from: 5, to: 12, lanes: 2 },
          { from: 12, to: 16, lanes: 1 },
          { from: 16, to: 23, lanes: 2 },
          { from: 23, to: 29, lanes: 1 },
        ],
        [7, 9, 10, 13, 15, 18, 20, 22, 25, 27]
      ),
    ],
    switchback: [
      createTemplate(
        "switchback-a",
        [
          [100, 452], [170, 426], [244, 398], [316, 360], [386, 320], [456, 314], [528, 340],
          [596, 382], [664, 420], [738, 408], [808, 370], [876, 326], [944, 284],
          [964, 212], [930, 150], [864, 120], [786, 120], [706, 136], [632, 168], [564, 202],
          [492, 204], [418, 172], [344, 136], [266, 118], [192, 132], [132, 182], [106, 252], [96, 324], [94, 388], [96, 444],
        ],
        [6, 12, 18, 24],
        [
          { from: 0, to: 4, lanes: 1 },
          { from: 4, to: 12, lanes: 2 },
          { from: 12, to: 16, lanes: 1 },
          { from: 16, to: 22, lanes: 2 },
          { from: 22, to: 29, lanes: 1 },
        ],
        [7, 8, 11, 13, 15, 19, 20, 21, 25, 27]
      ),
      createTemplate(
        "switchback-b",
        [
          [92, 458], [156, 430], [224, 396], [288, 352], [352, 306], [422, 286], [500, 302],
          [578, 340], [650, 384], [722, 426], [796, 424], [872, 390], [950, 352],
          [988, 290], [972, 216], [922, 156], [850, 124], [770, 122], [690, 138], [612, 170],
          [534, 198], [456, 190], [382, 156], [306, 126], [228, 122], [158, 150], [112, 208], [96, 280], [94, 352], [94, 420],
        ],
        [6, 12, 18, 24],
        [
          { from: 0, to: 5, lanes: 1 },
          { from: 5, to: 12, lanes: 2 },
          { from: 12, to: 16, lanes: 1 },
          { from: 16, to: 23, lanes: 2 },
          { from: 23, to: 29, lanes: 1 },
        ],
        [7, 10, 11, 13, 15, 18, 20, 22, 26, 27]
      ),
    ],
    lagoon: [
      createGeneratedTemplate("lagoon-loop-a", "lagoon", [
        [106, 408], [150, 330], [244, 282], [354, 288], [452, 344], [534, 424],
        [636, 468], [768, 444], [894, 374], [960, 276], [914, 176], [792, 118],
        [650, 130], [548, 196], [468, 254], [356, 230], [244, 158], [132, 176],
        [82, 264], [106, 408],
      ]),
      createGeneratedTemplate("lagoon-loop-b", "lagoon", [
        [96, 438], [132, 340], [228, 286], [344, 306], [448, 382], [560, 450],
        [704, 462], [842, 406], [948, 300], [966, 194], [884, 118], [752, 110],
        [614, 156], [514, 226], [402, 204], [284, 132], [164, 150], [90, 238],
        [72, 344], [96, 438],
      ]),
    ],
    canyon: [
      createGeneratedTemplate("canyon-spiral-a", "canyon", [
        [96, 466], [198, 456], [308, 438], [416, 406], [514, 350], [592, 284],
        [646, 218], [650, 162], [594, 126], [500, 130], [402, 174], [330, 238],
        [310, 310], [366, 366], [468, 382], [594, 350], [720, 300], [846, 242],
        [960, 214], [990, 286], [924, 374], [812, 430], [676, 466], [532, 486],
        [392, 488], [252, 482], [148, 474], [96, 466],
      ]),
      createGeneratedTemplate("canyon-spiral-b", "canyon", [
        [92, 454], [190, 424], [286, 380], [374, 320], [456, 252], [544, 196],
        [638, 168], [714, 178], [746, 226], [712, 282], [626, 324], [514, 348],
        [404, 374], [346, 430], [404, 486], [548, 494], [704, 462], [848, 400],
        [962, 318], [980, 222], [902, 146], [754, 106], [588, 112], [424, 148],
        [280, 210], [168, 302], [104, 390], [92, 454],
      ]),
    ],
    speedway: [
      createGeneratedTemplate("speedway-oval-a", "speedway", [
        [116, 420], [184, 484], [320, 504], [500, 506], [680, 504], [842, 482],
        [944, 420], [982, 318], [954, 214], [850, 144], [680, 116], [500, 112],
        [320, 116], [180, 146], [98, 218], [74, 316], [116, 420],
      ]),
      createGeneratedTemplate("speedway-oval-b", "speedway", [
        [128, 438], [238, 498], [404, 514], [604, 510], [784, 486], [924, 416],
        [980, 304], [940, 188], [806, 126], [612, 106], [416, 110], [242, 136],
        [116, 204], [66, 310], [88, 386], [128, 438],
      ]),
    ],
    summit: [
      createGeneratedTemplate("summit-climb-a", "summit", [
        [88, 488], [148, 438], [226, 456], [294, 396], [226, 340], [156, 292],
        [220, 234], [338, 246], [434, 212], [378, 152], [486, 96], [618, 116],
        [712, 170], [810, 144], [934, 198], [968, 292], [904, 372], [790, 404],
        [670, 386], [560, 430], [430, 480], [278, 498], [150, 496], [88, 488],
      ]),
      createGeneratedTemplate("summit-climb-b", "summit", [
        [92, 472], [158, 404], [252, 424], [338, 354], [272, 286], [164, 246],
        [236, 176], [368, 188], [478, 136], [590, 82], [710, 112], [766, 184],
        [880, 168], [970, 246], [950, 340], [846, 404], [712, 432], [570, 408],
        [444, 462], [302, 500], [164, 502], [92, 472],
      ]),
    ],
    nebula: [
      createGeneratedTemplate("nebula-eight-a", "nebula", [
        [98, 288], [160, 204], [268, 162], [388, 186], [488, 260], [552, 330],
        [636, 394], [760, 424], [884, 386], [954, 300], [926, 210], [816, 158],
        [688, 178], [584, 254], [494, 330], [390, 396], [264, 418], [154, 374],
        [98, 288],
      ]),
      createGeneratedTemplate("nebula-eight-b", "nebula", [
        [88, 306], [142, 220], [256, 174], [390, 192], [508, 284], [604, 370],
        [730, 420], [858, 396], [956, 320], [966, 222], [874, 150], [736, 138],
        [608, 192], [500, 286], [396, 378], [270, 426], [144, 394], [88, 306],
      ]),
    ],
  };

  const state = {
    config: {
      players: 2,
      humans: 1,
      mode: 1,
      theme: "sand",
      track: "classic",
    },
    clientId: getClientId(),
    lobby: {
      active: false,
      code: "",
      revision: 0,
      configVersion: 0,
      players: [],
    },
    players: [],
    activeIndex: 0,
    phase: "lobby",
    currentQuestion: null,
    askedQuestionIds: new Set(),
    feedback: "Set up the race and start.",
    forceThree: false,
    placements: [],
    lastRace: [],
    track: buildTrackInstance("classic"),
    review: null,
    activityLog: [],
    adminOpen: false,
  };

  const lobbySync = {
    remote: false,
    checked: false,
    registry: {},
    lastError: "",
    lastSyncAt: 0,
    stream: null,
  };

  const els = {
    playerName: document.querySelector("#player-name"),
    joinCode: document.querySelector("#join-code"),
    createRaceBtn: document.querySelector("#create-race-btn"),
    joinRaceBtn: document.querySelector("#join-race-btn"),
    adminToggleBtn: document.querySelector("#admin-toggle-btn"),
    releaseNote: document.querySelector("#release-note"),
    adminPanel: document.querySelector("#admin-panel"),
    closeRaceBtn: document.querySelector("#close-race-btn"),
    lobbyCode: document.querySelector("#lobby-code"),
    lobbyStatus: document.querySelector("#lobby-status"),
    lobbyPlayers: document.querySelector("#lobby-players"),
    availableLobbies: document.querySelector("#available-lobbies"),
    playerCount: document.querySelector("#player-count"),
    humanCount: document.querySelector("#human-count"),
    modeSelect: document.querySelector("#mode-select"),
    trackSelect: document.querySelector("#track-select"),
    themeSelect: document.querySelector("#theme-select"),
    themeButtons: [...document.querySelectorAll("[data-theme-choice]")],
    driverConfig: document.querySelector("#driver-config"),
    startRaceBtn: document.querySelector("#start-race-btn"),
    newRaceBtn: document.querySelector("#new-race-btn"),
    randomizeTrackBtn: document.querySelector("#randomize-track-btn"),
    boardStage: document.querySelector("#board-stage"),
    statusSummary: document.querySelector("#status-summary"),
    driverRoster: document.querySelector("#driver-roster"),
    activityFeed: document.querySelector("#activity-feed"),
    hazardLegend: document.querySelector("#hazard-legend"),
    raceConsole: document.querySelector("#race-console"),
    driverTemplate: document.querySelector("#driver-config-template"),
  };

  function createTemplate(key, points, safeSpots, laneSegments, hazardCandidates) {
    return {
      key,
      points,
      safeSpots,
      laneSegments,
      hazardCandidates,
    };
  }

  function createGeneratedTemplate(key, family, controlPoints) {
    const points = resamplePath(controlPoints, TRACK_LENGTH);
    return createTemplate(
      key,
      points,
      [6, 12, 18, 24],
      laneSegmentsForFamily(family),
      [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27]
    );
  }

  function laneSegmentsForFamily(family) {
    if (family === "speedway") {
      return [
        { from: 0, to: 29, lanes: 2 },
      ];
    }
    if (family === "canyon" || family === "summit") {
      return [
        { from: 0, to: 8, lanes: 1 },
        { from: 8, to: 18, lanes: 2 },
        { from: 18, to: 29, lanes: 1 },
      ];
    }
    return [
      { from: 0, to: 7, lanes: 1 },
      { from: 7, to: 20, lanes: 2 },
      { from: 20, to: 29, lanes: 1 },
    ];
  }

  function resamplePath(controlPoints, targetCount) {
    const lengths = [0];
    let total = 0;
    for (let index = 1; index < controlPoints.length; index += 1) {
      total += distance(controlPoints[index - 1], controlPoints[index]);
      lengths.push(total);
    }

    return Array.from({ length: targetCount }, (_, pointIndex) => {
      const target = (total * pointIndex) / (targetCount - 1);
      let segment = 1;
      while (segment < lengths.length - 1 && lengths[segment] < target) {
        segment += 1;
      }
      const start = controlPoints[segment - 1];
      const end = controlPoints[segment];
      const segmentLength = lengths[segment] - lengths[segment - 1] || 1;
      const ratio = (target - lengths[segment - 1]) / segmentLength;
      return [
        Math.round(start[0] + (end[0] - start[0]) * ratio),
        Math.round(start[1] + (end[1] - start[1]) * ratio),
      ];
    });
  }

  function distance(a, b) {
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }

  function buildTrackInstance(layoutKey, preferredTemplateKey = "") {
    const family = TRACK_LAYOUTS[layoutKey].family;
    const templates = TRACK_LIBRARY[family];
    const template = templates.find((entry) => entry.key === preferredTemplateKey)
      || templates[randInt(0, templates.length - 1)];
    const hazards = randomizeHazards(template.hazardCandidates);
    return {
      layoutKey,
      templateKey: template.key,
      world: TRACK_LAYOUTS[layoutKey].world,
      points: template.points.map((point) => [...point]),
      safeSpots: new Set(template.safeSpots),
      laneSegments: template.laneSegments.map((segment) => ({ ...segment })),
      hazardCandidates: [...template.hazardCandidates],
      hazards,
    };
  }

  function randomizeCurrentTrack() {
    state.track.hazards = randomizeHazards([...state.track.hazardCandidates]);
    invalidateLobbyReady();
    state.feedback = `Hazards randomized on ${TRACK_LAYOUTS[state.config.track].name}.`;
    if (state.lobby.active && lobbySync.remote) {
      syncLobbySetup().catch((error) => showError(error.message));
    }
    render();
  }

  function randomizeHazards(candidates) {
    const pool = shuffle([...new Set(candidates)].filter((index) => index > 0 && index < FINISH_INDEX));
    const minCount = Math.min(4, pool.length);
    const maxCount = Math.min(9, pool.length);
    const count = randInt(minCount, maxCount);
    return pool.slice(0, count).map((space) => ({
      space,
      type: HAZARD_KEYS[randInt(0, HAZARD_KEYS.length - 1)],
    })).sort((a, b) => a.space - b.space);
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = randInt(0, index);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function currentPlayer() {
    return state.players[state.activeIndex];
  }

  function hazardAt(index) {
    return Array.isArray(state.track.hazards)
      ? state.track.hazards.find((hazard) => hazard.space === index)?.type || null
      : Object.entries(state.track.hazards).find(([, value]) => value === index)?.[0] || null;
  }

  function getClientId() {
    try {
      const saved = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
      if (saved) return saved;
      const created = `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, created);
      return created;
    } catch {
      return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  function initControls() {
    initLobbyFieldsFromUrl();
    for (let value = 2; value <= MAX_PLAYERS; value += 1) {
      els.playerCount.append(new Option(String(value), String(value)));
    }
    for (let value = 1; value <= MAX_PLAYERS; value += 1) {
      els.humanCount.append(new Option(String(value), String(value)));
    }
    for (let value = 1; value <= COURSE_MODULES.length; value += 1) {
      els.modeSelect.append(new Option(`${value}: ${MODE_NAMES[value]}`, String(value)));
    }
    Object.entries(TRACK_LAYOUTS).forEach(([key, layout]) => {
      els.trackSelect.append(new Option(layout.name, key));
    });

    els.playerCount.value = String(state.config.players);
    els.humanCount.value = String(state.config.humans);
    els.modeSelect.value = String(state.config.mode);
    els.trackSelect.value = state.config.track;
    syncThemeControls();

    els.playerCount.addEventListener("change", () => {
      state.config.players = Number(els.playerCount.value);
      state.config.humans = clamp(state.config.humans, minimumHumanDrivers(), state.config.players);
      els.humanCount.value = String(state.config.humans);
      invalidateLobbyReady();
      rebuildDriverConfig();
      if (state.lobby.active && lobbySync.remote) {
        syncLobbySetup().catch((error) => showError(error.message));
      }
      render();
    });

    els.humanCount.addEventListener("change", () => {
      state.config.humans = clamp(Number(els.humanCount.value), minimumHumanDrivers(), state.config.players);
      invalidateLobbyReady();
      rebuildDriverConfig();
      if (state.lobby.active && lobbySync.remote) {
        syncLobbySetup().catch((error) => showError(error.message));
      }
      render();
    });

    els.modeSelect.addEventListener("change", () => {
      state.config.mode = Number(els.modeSelect.value);
      invalidateLobbyReady();
      if (state.lobby.active && lobbySync.remote) {
        syncLobbySetup().catch((error) => showError(error.message));
      }
      render();
    });

    els.trackSelect.addEventListener("change", () => {
      state.config.track = els.trackSelect.value;
      state.track = buildTrackInstance(state.config.track);
      invalidateLobbyReady();
      if (state.lobby.active && lobbySync.remote) {
        syncLobbySetup().catch((error) => showError(error.message));
      }
      render();
    });

    els.themeSelect.addEventListener("change", () => {
      updateTheme(els.themeSelect.value);
    });
    els.themeButtons.forEach((button) => {
      button.addEventListener("click", () => updateTheme(button.dataset.themeChoice));
    });

    els.createRaceBtn.addEventListener("click", createLobby);
    els.joinRaceBtn.addEventListener("click", joinLobby);
    els.adminToggleBtn.addEventListener("click", toggleAdminPanel);
    els.startRaceBtn.addEventListener("click", startRace);
    els.newRaceBtn.addEventListener("click", resetToSetup);
    els.randomizeTrackBtn.addEventListener("click", randomizeCurrentTrack);
    els.closeRaceBtn.addEventListener("click", closeCurrentRace);
    window.addEventListener("storage", (event) => {
      if (event.key !== LOBBY_STORAGE_KEY) return;
      const latest = readLobby(state.lobby.code);
      if (latest) {
        loadLobby(latest);
        render();
        return;
      }
      render();
    });

    initRemoteLobbySync();
  }

  function initLobbyFieldsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const race = (params.get("race") || params.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const name = (params.get("name") || "").trim().slice(0, 18);
    if (race) els.joinCode.value = race;
    if (name) els.playerName.value = name;
  }

  async function createLobby() {
    await refreshRemoteLobbies();
    if (!lobbySync.remote) {
      state.feedback = "The game server is unavailable. This release build requires the Rescue Gran Prix server.";
      render();
      return;
    }
    const name = normalizedPlayerName();
    const requestedCode = normalizedLobbyCode();
    const code = requestedCode && requestedCode !== state.lobby.code ? requestedCode : randomLobbyCode();
    try {
      state.track = buildTrackInstance(state.config.track);
      await postLobbyAction("create", {
        code,
        config: state.config,
        trackKey: state.track.templateKey,
        hazards: cloneHazards(state.track.hazards),
      });
      state.feedback = `${name} created race ${code}.`;
      rebuildDriverConfig();
      render();
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  async function joinLobby() {
    await refreshRemoteLobbies();
    if (!lobbySync.remote) {
      state.feedback = "The game server is unavailable. This release build requires the Rescue Gran Prix server.";
      render();
      return;
    }
    const code = normalizedLobbyCode();
    const localName = normalizedPlayerName();
    if (!code) {
      state.feedback = "Enter a race code or double-click an available race.";
      render();
      return;
    }
    try {
      await postLobbyAction("join", { code });
      state.feedback = `${localName} joined race ${code}.`;
      rebuildDriverConfig();
      render();
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  function upsertLobbyPlayer(id, name, host) {
    const existing = state.lobby.players.find((player) => player.id === id);
    if (existing) {
      existing.name = name;
      existing.host = existing.host || host;
      return;
    }
    state.lobby.players.push({
      id,
      name,
      host,
      readyVersion: 0,
    });
  }

  function toggleReady() {
    return;
  }

  function localLobbyPlayer() {
    const name = normalizedPlayerName();
    return state.lobby.players.find((player) => player.name === name)
      || state.lobby.players.find((player) => player.id === state.clientId);
  }

  function localPlayerIndex() {
    const local = localLobbyPlayer();
    if (!local) return -1;
    return state.lobby.players.findIndex((player) => player.id === local.id);
  }

  function localIsHost() {
    return Boolean(localLobbyPlayer()?.host);
  }

  function localCanControlTurn() {
    const player = currentPlayer();
    if (!player || player.isAi) return false;
    return localPlayerIndex() === state.activeIndex;
  }

  function appendActivity(kind, text) {
    state.activityLog.push({
      at: Date.now(),
      kind,
      text,
    });
    state.activityLog = state.activityLog.slice(-40);
  }

  function normalizedLobbyCode() {
    return (els.joinCode.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  }

  function normalizedPlayerName() {
    return els.playerName.value.trim().slice(0, 18) || "Driver";
  }

  function randomLobbyCode() {
    return Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randInt(0, 31)]).join("");
  }

  function minimumHumanDrivers() {
    return clamp(state.lobby.players.length || 1, 1, state.config.players || MAX_PLAYERS);
  }

  function syncConfigToLobby() {
    state.config.players = clamp(Number(state.config.players) || 2, 2, MAX_PLAYERS);
    state.config.humans = clamp(Number(state.config.humans) || minimumHumanDrivers(), minimumHumanDrivers(), state.config.players);
    els.playerCount.value = String(state.config.players);
    els.humanCount.value = String(state.config.humans);
  }

  function invalidateLobbyReady() {
    if (!state.lobby.active) return;
    state.lobby.configVersion += 1;
    state.lobby.players.forEach((player) => {
      player.readyVersion = state.lobby.configVersion;
    });
    saveCurrentLobby();
  }

  function lobbyIsReady() {
    return state.lobby.active && state.lobby.players.length > 0;
  }

  function readLobbyRegistry() {
    if (lobbySync.remote) {
      return lobbySync.registry;
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(LOBBY_STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeLobbyRegistry(registry) {
    if (lobbySync.remote) {
      lobbySync.registry = registry;
    }
    try {
      localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify(registry));
    } catch {
      // Static preview keeps working without persistence.
    }
  }

  function readLobby(code) {
    const lobby = readLobbyRegistry()[code];
    return lobby && Array.isArray(lobby.players) ? lobby : null;
  }

  function actionUrl(code) {
    return `${LOBBY_API_URL}/${encodeURIComponent(code)}/action`;
  }

  function clearActiveLobby() {
    state.lobby = {
      active: false,
      code: "",
      revision: 0,
      configVersion: 0,
      players: [],
    };
    state.phase = "lobby";
    state.players = [];
    state.currentQuestion = null;
    state.review = null;
    state.activityLog = [];
    state.placements = [];
    state.lastRace = [];
  }

  async function postLobbyAction(type, payload = {}) {
    const code = String(payload.code || state.lobby.code || normalizedLobbyCode() || "").toUpperCase();
    const targetLobby = readLobby(code);
    const targetRevision = code === state.lobby.code
      ? Number(state.lobby.revision || 0)
      : Number(targetLobby?.revision || 0);
    if (!code) throw new Error("Race code is required.");
    const response = await fetch(actionUrl(code), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        code,
        clientId: state.clientId,
        playerName: normalizedPlayerName(),
        revision: Object.prototype.hasOwnProperty.call(payload, "revision") ? payload.revision : targetRevision,
        ...payload,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result && result.lobbies && typeof result.lobbies === "object") {
        lobbySync.registry = result.lobbies;
      }
      const error = new Error(result && result.error ? result.error : `Race action failed (${response.status})`);
      error.errorCode = result && result.errorCode ? result.errorCode : "";
      error.allowOverride = Boolean(result && result.allowOverride);
      error.maxRacers = Number(result && result.maxRacers || 0);
      error.absoluteMax = Number(result && result.absoluteMax || 0);
      throw error;
    }
    lobbySync.remote = true;
    lobbySync.checked = true;
    lobbySync.lastError = "";
    lobbySync.lastSyncAt = Date.now();
    if (result && result.lobbies && typeof result.lobbies === "object") {
      lobbySync.registry = result.lobbies;
      writeLobbyRegistry(result.lobbies);
    }
    if (result && result.lobby) {
      loadLobby(result.lobby);
    } else {
      clearActiveLobby();
    }
    return result;
  }

  async function syncLobbySetup() {
    if (!state.lobby.active || !lobbySync.remote) return;
    await postLobbyAction("configure", {
      config: state.config,
      trackKey: state.track.templateKey,
      hazards: cloneHazards(state.track.hazards),
    });
  }

  function collectDriverDefinitions() {
    return [...els.driverConfig.querySelectorAll(".driver-card")].map((card) => ({
      initials: card.querySelector(".driver-initials").value,
      timed: card.querySelector(".driver-timed").checked,
      controller: card.querySelector(".driver-controller").value,
    }));
  }

  function initRemoteLobbySync() {
    refreshRemoteLobbies();
    initLobbyStream();
    window.setInterval(refreshRemoteLobbies, 10000);
  }

  function initLobbyStream() {
    if (!("EventSource" in window) || lobbySync.stream) return;
    try {
      const stream = new EventSource(LOBBY_STREAM_URL);
      lobbySync.stream = stream;
      stream.onmessage = (event) => {
        const payload = JSON.parse(event.data || "{}");
        lobbySync.remote = true;
        lobbySync.checked = true;
        lobbySync.lastError = "";
        lobbySync.lastSyncAt = Date.now();
        lobbySync.registry = payload && payload.lobbies && typeof payload.lobbies === "object"
          ? payload.lobbies
          : {};
        writeLobbyRegistry(lobbySync.registry);
        if (state.lobby.active) {
          const latest = readLobby(state.lobby.code);
          if (latest) {
            loadLobby(latest);
            if (state.phase === "setup" || state.phase === "lobby") {
              rebuildDriverConfig();
            }
          } else {
            clearActiveLobby();
          }
        }
        render();
      };
      stream.onerror = () => {
        lobbySync.lastError = "Live server stream disconnected";
      };
    } catch {
      lobbySync.lastError = "Live server stream unavailable";
    }
  }

  async function refreshRemoteLobbies() {
    try {
      const response = await fetch(LOBBY_API_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Lobby API returned ${response.status}`);
      const payload = await response.json();
      lobbySync.remote = true;
      lobbySync.checked = true;
      lobbySync.lastError = "";
      lobbySync.registry = payload && payload.lobbies && typeof payload.lobbies === "object"
        ? payload.lobbies
        : {};

      lobbySync.lastSyncAt = Date.now();
      if (state.lobby.active) {
        const latest = readLobby(state.lobby.code);
        if (latest) {
          loadLobby(latest);
          if (state.phase === "setup" || state.phase === "lobby") {
            rebuildDriverConfig();
          }
        }
      }
      render();
    } catch (error) {
      lobbySync.checked = true;
      lobbySync.lastError = error && error.message ? error.message : "Lobby API unavailable";
    }
  }

  async function persistRemoteLobby(lobby) {
    if (!lobbySync.remote || !lobby || !lobby.code) return;
    try {
      const response = await fetch(`${LOBBY_API_URL}/${encodeURIComponent(lobby.code)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lobby),
      });
      if (response.status === 409) {
        const payload = await response.json();
        if (payload && payload.lobby) {
          loadLobby(payload.lobby);
        }
        throw new Error("Lobby changed on another device. Latest state loaded.");
      }
      if (!response.ok) throw new Error(`Lobby save returned ${response.status}`);
      const payload = await response.json();
      if (payload && payload.lobby) {
        state.lobby.revision = Number(payload.lobby.revision || state.lobby.revision);
      }
      if (payload && payload.lobbies && typeof payload.lobbies === "object") {
        lobbySync.registry = payload.lobbies;
      }
      lobbySync.lastSyncAt = Date.now();
    } catch (error) {
      lobbySync.lastError = error && error.message ? error.message : "Lobby save failed";
    }
  }

  function saveCurrentLobby() {
    if (!state.lobby.active || !state.lobby.code) return;
    const registry = readLobbyRegistry();
    const savedLobby = {
      ...state.lobby,
      updatedAt: Date.now(),
      config: { ...state.config },
      trackKey: state.track.templateKey,
      hazards: cloneHazards(state.track.hazards),
      game: serializeGameState(),
      activityLog: state.activityLog.slice(-40),
    };
    registry[state.lobby.code] = savedLobby;
    writeLobbyRegistry(registry);
    if (!lobbySync.remote) {
      persistRemoteLobby(savedLobby);
    }
  }

  function loadLobby(lobby) {
    state.lobby = {
      active: true,
      code: lobby.code,
      revision: Number(lobby.revision || 0),
      configVersion: lobby.configVersion || 1,
      players: Array.isArray(lobby.players) ? lobby.players : [],
    };
    if (lobby.config) {
      state.config = {
        ...state.config,
        ...lobby.config,
      };
      state.config.players = Math.max(state.config.players, Array.isArray(lobby.players) ? lobby.players.length : 0, 2);
      state.config.humans = clamp(Math.max(state.config.humans, state.lobby.players.length), 1, state.config.players);
      els.playerCount.value = String(state.config.players);
      els.humanCount.value = String(state.config.humans);
      els.modeSelect.value = String(state.config.mode);
      els.trackSelect.value = state.config.track;
      syncThemeControls();
      state.track = buildTrackInstance(state.config.track, lobby.trackKey);
      if (lobby.hazards) {
        state.track.hazards = cloneHazards(lobby.hazards);
      }
    }
    state.activityLog = Array.isArray(lobby.activityLog) ? lobby.activityLog.slice(-40) : [];
    applyGameState(lobby.game);
  }

  function serializeGameState() {
    return {
      phase: state.phase,
      activeIndex: state.activeIndex,
      currentQuestion: state.currentQuestion,
      review: state.review,
      players: state.players.map((player) => ({ ...player })),
      askedQuestionIds: [...state.askedQuestionIds],
      forceThree: state.forceThree,
      placements: state.placements.map((player) => ({ ...player })),
      lastRace: state.lastRace.map((record) => ({ ...record })),
      feedback: state.feedback,
      trackTemplateKey: state.track.templateKey,
    };
  }

  function applyGameState(game) {
    if (!game || typeof game !== "object") return;
    state.phase = typeof game.phase === "string" ? game.phase : state.phase;
    state.activeIndex = Number.isInteger(game.activeIndex) ? game.activeIndex : state.activeIndex;
    state.currentQuestion = game.currentQuestion && typeof game.currentQuestion === "object" ? game.currentQuestion : null;
    state.review = game.review && typeof game.review === "object" ? game.review : null;
    state.players = Array.isArray(game.players) ? game.players.map((player) => ({ ...player })) : state.players;
    state.askedQuestionIds = new Set(Array.isArray(game.askedQuestionIds) ? game.askedQuestionIds : []);
    state.forceThree = Boolean(game.forceThree);
    state.placements = Array.isArray(game.placements) ? game.placements.map((player) => ({ ...player })) : [];
    state.lastRace = Array.isArray(game.lastRace) ? game.lastRace.map((record) => ({ ...record })) : [];
    state.feedback = typeof game.feedback === "string" ? game.feedback : state.feedback;
    if (typeof game.trackTemplateKey === "string" && game.trackTemplateKey) {
      state.track = buildTrackInstance(state.config.track, game.trackTemplateKey);
      if (readLobby(state.lobby.code)?.hazards) {
        state.track.hazards = cloneHazards(readLobby(state.lobby.code).hazards);
      }
    }
  }

  function cloneHazards(hazards) {
    if (Array.isArray(hazards)) {
      return hazards.map((hazard) => ({ ...hazard }));
    }
    return Object.entries(hazards || {}).map(([type, space]) => ({ type, space }));
  }

  function syncThemeControls() {
    els.themeSelect.value = state.config.theme;
    els.themeButtons.forEach((button) => {
      const active = button.dataset.themeChoice === state.config.theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateTheme(theme) {
    state.config.theme = String(theme || "sand");
    syncThemeControls();
    invalidateLobbyReady();
    applyTheme();
    if (state.lobby.active && lobbySync.remote) {
      syncLobbySetup().catch((error) => showError(error.message));
    }
    render();
  }

  function applyTheme() {
    const root = document.documentElement;
    root.dataset.theme = state.config.theme;
    if (state.config.theme === "midnight") {
      root.style.setProperty("--bg", "#16202a");
      root.style.setProperty("--bg-accent", "#202f3b");
      root.style.setProperty("--panel", "rgba(31, 40, 53, 0.9)");
      root.style.setProperty("--panel-border", "#8090a4");
      root.style.setProperty("--text", "#edf1f4");
      root.style.setProperty("--muted", "#b8c0ca");
      root.style.setProperty("--road", "#5d6773");
      root.style.setProperty("--road-edge", "#f1f3f6");
      root.style.setProperty("--highlight", "#ef6a61");
      root.style.setProperty("--track-bg", "linear-gradient(180deg, #35414d 0%, #2a3440 100%)");
    } else if (state.config.theme === "forest") {
      root.style.setProperty("--bg", "#dde7d6");
      root.style.setProperty("--bg-accent", "#edf4e6");
      root.style.setProperty("--panel", "rgba(250, 252, 246, 0.9)");
      root.style.setProperty("--panel-border", "#52624f");
      root.style.setProperty("--text", "#2c362c");
      root.style.setProperty("--muted", "#667364");
      root.style.setProperty("--road", "#677071");
      root.style.setProperty("--road-edge", "#f4f5ef");
      root.style.setProperty("--highlight", "#bb5a42");
      root.style.setProperty("--track-bg", "linear-gradient(180deg, #c7d0be 0%, #b8c4af 100%)");
    } else if (state.config.theme === "sunset") {
      root.style.setProperty("--bg", "#ead8c6");
      root.style.setProperty("--bg-accent", "#fff3dd");
      root.style.setProperty("--panel", "rgba(255, 250, 239, 0.92)");
      root.style.setProperty("--panel-border", "#7a4d58");
      root.style.setProperty("--text", "#3d2d32");
      root.style.setProperty("--muted", "#746269");
      root.style.setProperty("--road", "#6a6266");
      root.style.setProperty("--road-edge", "#fff3e9");
      root.style.setProperty("--highlight", "#c85644");
      root.style.setProperty("--track-bg", "linear-gradient(180deg, #f1b47e 0%, #d48a79 100%)");
    } else {
      root.dataset.theme = "sand";
      root.style.removeProperty("--bg");
      root.style.removeProperty("--bg-accent");
      root.style.removeProperty("--panel");
      root.style.removeProperty("--panel-border");
      root.style.removeProperty("--text");
      root.style.removeProperty("--muted");
      root.style.removeProperty("--road");
      root.style.removeProperty("--road-edge");
      root.style.removeProperty("--highlight");
      root.style.removeProperty("--track-bg");
    }
  }

  function rebuildDriverConfig() {
    els.driverConfig.innerHTML = "";
    const totalDrivers = Math.max(state.config.players, state.lobby.players.length || 0, 2);
    state.config.players = clamp(totalDrivers, 2, MAX_PLAYERS);
    els.playerCount.value = String(state.config.players);
    state.config.humans = clamp(state.config.humans, minimumHumanDrivers(), state.config.players);
    els.humanCount.value = String(state.config.humans);
    for (let index = 0; index < state.config.players; index += 1) {
      const player = styleForIndex(index);
      const lobbyPlayer = state.lobby.players[index];
      const fragment = els.driverTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".driver-card");
      const swatch = fragment.querySelector(".swatch");
      const name = fragment.querySelector(".driver-name");
      const initials = fragment.querySelector(".driver-initials");
      const controller = fragment.querySelector(".driver-controller");

      swatch.style.background = player.color;
      name.textContent = lobbyPlayer ? lobbyPlayer.name : player.name;
      initials.value = (lobbyPlayer ? lobbyPlayer.name : player.name).split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase();
      controller.value = lobbyPlayer || index < state.config.humans ? "human" : "ai";
      controller.addEventListener("change", syncHumanCountFromControllers);
      card.dataset.index = String(index);
      els.driverConfig.append(card);
    }
    const humans = [...els.driverConfig.querySelectorAll(".driver-card")]
      .filter((card) => card.querySelector(".driver-controller").value === "human").length;
    state.config.humans = clamp(humans, 1, state.config.players);
    els.humanCount.value = String(state.config.humans);
  }

  function syncHumanCountFromControllers() {
    const cards = [...els.driverConfig.querySelectorAll(".driver-card")];
    const humans = cards.filter((card) => card.querySelector(".driver-controller").value === "human").length;
    state.config.humans = clamp(humans, minimumHumanDrivers(), state.config.players);
    els.humanCount.value = String(state.config.humans);
    invalidateLobbyReady();
  }

  async function startRace() {
    try {
      await postLobbyAction("startRace", {
        drivers: collectDriverDefinitions(),
      });
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  async function resetToSetup() {
    if (!state.lobby.active || !lobbySync.remote) {
      clearActiveLobby();
      render();
      return;
    }
    try {
      await postLobbyAction("reset");
      rebuildDriverConfig();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  function leaveCurrentRace() {
    const code = state.lobby.code;
    clearActiveLobby();
    if (code) {
      els.joinCode.value = code;
      state.feedback = `Left race ${code}.`;
    }
    render();
  }

  function difficultyForMove(player, spaces, repair) {
    if (repair) return 0;
    return clamp((player.score > 18 ? 1 : 0) + (spaces - 1), 0, 4);
  }

  function generateQuestion(player, spaces, repair = false) {
    const difficulty = difficultyForMove(player, spaces, repair);
    const selectedModule = COURSE_MODULES[state.config.mode - 1] || COURSE_MODULES[0];
    const allQuestions = Array.isArray(window.RESCUE_QUESTIONS) ? window.RESCUE_QUESTIONS : [];
    const moduleQuestions = selectedModule.all
      ? allQuestions
      : allQuestions.filter((question) => question.moduleSlug === selectedModule.slug);
    const exactDifficulty = moduleQuestions.filter((question) => question.difficulty === difficulty + 1);
    const nearbyDifficulty = moduleQuestions.filter((question) => question.difficulty <= difficulty + 1);
    const fallbackQuestions = moduleQuestions.length ? moduleQuestions : allQuestions;
    let pool = exactDifficulty.length ? exactDifficulty : nearbyDifficulty.length ? nearbyDifficulty : fallbackQuestions;
    const freshPool = pool.filter((question) => !state.askedQuestionIds.has(question.id));
    if (freshPool.length) {
      pool = freshPool;
    } else if (state.askedQuestionIds.size > 0) {
      state.askedQuestionIds.clear();
    }

    const question = pool[randInt(0, pool.length - 1)];
    if (!question) {
      throw new Error("Rescue question bank is empty or failed to load.");
    }

    state.askedQuestionIds.add(question.id);
    const options = shuffle(question.options.map((option) => ({ ...option })));
    const correctOption = options.find((option) => option.isCorrect);
    if (!correctOption) {
      throw new Error(`Question ${question.id} has no correct answer.`);
    }
    return {
      id: question.id,
      prompt: question.text,
      answer: correctOption.id,
      correctText: correctOption.text,
      difficulty: Math.max(0, question.difficulty - 1),
      moduleName: MODE_NAMES[state.config.mode],
      questionStyle: question.questionStyle,
      caseContext: question.caseContext,
      sourceRef: question.sourceRef,
      explanation: question.explanation,
      options,
    };
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function awardPoints(player, difficulty, move) {
    const score = DIFFICULTY_POINTS[difficulty] + Math.max(0, move - 1);
    player.score += score;
    player.correctAnswers += 1;
    return score;
  }

  async function askQuestion(move) {
    try {
      await postLobbyAction("chooseMove", { move });
      render();
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  function queueAiTurn() {
    setTimeout(() => {
      if (state.phase !== "chooseMove" || !currentPlayer().isAi) return;
      askQuestion(chooseAiMove(currentPlayer()));
    }, 550);
  }

  function queueAiAnswer() {
    setTimeout(() => {
      if (state.phase !== "answering" || !currentPlayer().isAi) return;
      const difficulty = state.currentQuestion.difficulty;
      const accuracy = clamp(0.9 - difficulty * 0.12, 0.24, 0.97);
      const answer = Math.random() < accuracy
        ? state.currentQuestion.answer
        : randomWrongOptionId(state.currentQuestion);
      submitAnswer(String(answer));
    }, 850);
  }

  function randomWrongOptionId(question) {
    const wrongOptions = question.options.filter((option) => option.id !== question.answer);
    if (!wrongOptions.length) return question.answer;
    return wrongOptions[randInt(0, wrongOptions.length - 1)].id;
  }

  function chooseAiMove(player) {
    if (state.forceThree) return 3;
    if (player.brokenDown) return 1;

    let bestMove = 1;
    let bestScore = -Infinity;
    for (const move of MOVE_OPTIONS) {
      const target = Math.min(FINISH_INDEX, player.position + move);
      const hazard = hazardAt(target);
      let score = move * 4 + (move === 1 ? 2 : 0);
      if (hazard === "spinner") score += 10;
      if (hazard === "skipper") score += 12;
      if (hazard === "sinker") score += 8;
      if (hazard === "steps") score += 5;
      if (hazard === "oil") score += 3;
      if (hazard === "redflag") score -= 8;
      if (target >= FIRST_CROSSING_INDEX && !state.track.safeSpots.has(target)) {
        score += state.players.filter((other) => other !== player && other.position === target && !other.brokenDown).length * 9;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  async function submitAnswer(rawValue) {
    try {
      await postLobbyAction("submitAnswer", { answerId: rawValue });
      render();
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  function applyMove(player, move, points) {
    player.position = Math.min(FINISH_INDEX, player.position + move);
    const target = player.position;
    const opponents = state.players.filter((other) => other !== player && other.position === target);

    if (target >= FIRST_CROSSING_INDEX && !state.track.safeSpots.has(target)) {
      opponents.forEach((opponent) => {
        if (opponent.brokenDown) return;
        if (opponent.shielded) {
          opponent.shielded = false;
        } else {
          opponent.brokenDown = true;
        }
      });
    }

    const hazard = hazardAt(target);
    if (hazard === "spinner") {
      const jump = randInt(1, 4);
      player.position = Math.min(FINISH_INDEX, player.position + jump);
      state.feedback = `${player.name} hit Spinner and jumped ${jump} more spaces. +${points} points.`;
    } else if (hazard === "skipper") {
      player.skipNextSelection = true;
      state.feedback = `${player.name} hit Skipper and earns an extra turn. +${points} points.`;
    } else if (hazard === "sinker") {
      player.shielded = true;
      state.feedback = `${player.name} hit Sinker and gained one bump shield. +${points} points.`;
    } else if (hazard === "steps") {
      state.forceThree = true;
      state.feedback = `${player.name} reached Steps. Only 3-space moves remain. +${points} points.`;
    } else if (hazard === "oil") {
      const slide = Math.min(2, FINISH_INDEX - player.position);
      player.position = Math.min(FINISH_INDEX, player.position + slide);
      player.missNextTurn = true;
      state.feedback = `${player.name} hit an Oil Slick, slid ${slide} extra space${slide === 1 ? "" : "s"}, and will lose the next turn. +${points} points.`;
    } else if (hazard === "redflag") {
      player.missNextTurn = true;
      state.feedback = `${player.name} triggered a Red Flag and will lose the next turn. +${points} points.`;
    } else {
      state.feedback = `${player.name} advanced ${move} space${move === 1 ? "" : "s"}. +${points} points.`;
    }

    if (player.position >= FINISH_INDEX) {
      finishRace(player);
    }
  }

  function finishRace(winner) {
    state.phase = "gameOver";
    state.placements = [...state.players].sort((a, b) => {
      if (b.position !== a.position) return b.position - a.position;
      return b.score - a.score;
    });

    state.placements.forEach((player, index) => {
      player.score += PLACEMENT_BONUS[index] || 0;
    });

    state.feedback = `${winner.name} wins the race on ${TRACK_LAYOUTS[state.config.track].name}.`;
    state.lastRace = state.placements.map((player, index) => ({
      initials: player.initials,
      score: player.score,
      place: index + 1,
      name: player.name,
      mode: state.config.mode,
      track: state.track.templateKey,
    }));
    appendActivity("finish", `${winner.name} won the race on ${TRACK_LAYOUTS[state.config.track].name}.`);
  }

  function nextTurn() {
    const player = currentPlayer();
    if (player.skipNextSelection) {
      player.skipNextSelection = false;
      state.phase = "chooseMove";
    } else {
      let nextIndex = (state.activeIndex + 1) % state.players.length;
      while (state.players[nextIndex]?.missNextTurn) {
        state.players[nextIndex].missNextTurn = false;
        appendActivity("race", `${state.players[nextIndex].name} lost a turn.`);
        nextIndex = (nextIndex + 1) % state.players.length;
      }
      state.activeIndex = nextIndex;
      state.phase = "chooseMove";
    }
    if (currentPlayer().isAi) {
      queueAiTurn();
    }
  }

  async function continueAfterReview() {
    try {
      await postLobbyAction("continue");
      render();
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  function renderBoard() {
    const points = state.track.points;
    const path = points.map((point) => point.join(",")).join(" ");
    const laneMarkup = state.track.laneSegments.map((segment) => laneSegmentSvg(points, segment)).join("");
    const sceneryMarkup = scenerySvg(state.track.world);
    const hazardMarkup = cloneHazards(state.track.hazards)
      .map(({ type, space }) => hazardSvg(points[space], type, space))
      .join("");
    const playerMarkup = state.players.map((player, index) => {
      const point = points[player.position] || points[0];
      const offsets = [[-20, -20], [20, -20], [-20, 20], [20, 20]];
      const [ox, oy] = offsets[index] || [0, 0];
      return carSvg(point[0] + ox, point[1] + oy, player.color, carAngle(points, player.position));
    }).join("");

    els.boardStage.innerHTML = `
      <svg viewBox="0 0 1040 560" aria-label="Rescue Gran Prix track">
        <defs>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="rgba(0,0,0,0.18)"></feDropShadow>
          </filter>
          <linearGradient id="roadStripe" x1="0" x2="1">
            <stop offset="0" stop-color="rgba(255,255,255,0.8)"></stop>
            <stop offset="1" stop-color="rgba(255,255,255,0.25)"></stop>
          </linearGradient>
        </defs>
        ${sceneryMarkup}
        <g filter="url(#softShadow)">
          <polyline points="${path}" fill="none" stroke="rgba(17,21,28,0.3)" stroke-width="112" stroke-linecap="round" stroke-linejoin="round"></polyline>
          <polyline points="${path}" fill="none" stroke="#e55a4e" stroke-width="92" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"></polyline>
          <polyline points="${path}" fill="none" stroke="var(--road)" stroke-width="84" stroke-linecap="round" stroke-linejoin="round"></polyline>
          <polyline points="${path}" fill="none" stroke="var(--road-edge)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></polyline>
          ${laneMarkup}
        </g>
        <g>
          <rect x="806" y="34" width="198" height="58" rx="16" fill="rgba(255,251,241,0.9)" stroke="var(--panel-border)" stroke-width="2"></rect>
          <text x="905" y="58" text-anchor="middle" fill="var(--text)" font-size="18" font-weight="800">${escapeHtml(TRACK_LAYOUTS[state.config.track].name)}</text>
          <text x="905" y="78" text-anchor="middle" fill="var(--muted)" font-size="12">${escapeHtml(state.track.templateKey)}</text>
        </g>
        <g>
          <rect x="28" y="26" width="164" height="98" rx="20" fill="rgba(255,251,241,0.95)" stroke="var(--panel-border)" stroke-width="2"></rect>
          <text x="54" y="58" fill="var(--text)" font-size="18" font-weight="800">START / FINISH</text>
          <rect x="48" y="72" width="120" height="10" rx="5" fill="#2c3440"></rect>
          <g transform="translate(52 88)">
            ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${i * 18}" y="0" width="10" height="32" fill="${i % 2 === 0 ? "#222" : "#f2f2f2"}"></rect>`).join("")}
          </g>
        </g>
        ${points.map((point, index) => nodeSvg(point, index)).join("")}
        ${hazardMarkup}
        ${playerMarkup}
      </svg>
    `;
  }

  function scenerySvg(world) {
    if (world === "space") {
      return `
        <rect x="0" y="0" width="1040" height="560" fill="#171c32"></rect>
        ${[[96, 84, 2], [184, 134, 3], [294, 72, 2], [436, 120, 2], [742, 86, 3], [918, 142, 2], [836, 430, 2], [168, 448, 2], [518, 472, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f7f0c8"></circle>`).join("")}
        <circle cx="846" cy="106" r="42" fill="#7158a8" opacity="0.82"></circle>
        <circle cx="872" cy="92" r="14" fill="#9f82d4" opacity="0.85"></circle>
        <path d="M0,496 C168,458 316,504 470,470 C646,430 800,492 1040,440 L1040,560 L0,560 Z" fill="rgba(91,122,156,0.22)"></path>
      `;
    }
    if (world === "canyon") {
      return `
        <rect x="0" y="0" width="1040" height="560" fill="#d7bd8e"></rect>
        <path d="M0,154 L112,80 L214,132 L324,64 L442,150 L552,78 L668,126 L778,68 L900,136 L1040,92 L1040,0 L0,0 Z" fill="rgba(138,78,58,0.42)"></path>
        <path d="M0,506 C150,470 300,520 464,474 C650,420 824,494 1040,438 L1040,560 L0,560 Z" fill="rgba(145,84,62,0.24)"></path>
        ${[[96, 406], [196, 98], [884, 388], [944, 326]].map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-6" y="-36" width="12" height="62" rx="5" fill="#5f7141"></rect><path d="M0,-10 h28 M0,4 h-24" stroke="#5f7141" stroke-width="8" stroke-linecap="round"></path></g>`).join("")}
      `;
    }
    if (world === "city") {
      return `
        <rect x="0" y="0" width="1040" height="560" fill="#c9d8df"></rect>
        <g opacity="0.78">
          ${[48, 112, 178, 792, 852, 916, 980].map((x, index) => {
            const height = [120, 86, 150, 106, 142, 92, 130][index];
            return `<rect x="${x}" y="${120 - height * 0.3}" width="46" height="${height}" rx="4" fill="${index % 2 ? "#7f9096" : "#637982"}"></rect>`;
          }).join("")}
          ${[70, 134, 200, 814, 874, 938].map((x) => `<path d="M${x},176 h26 M${x},198 h26 M${x},220 h26" stroke="rgba(255,255,255,0.45)" stroke-width="4"></path>`).join("")}
        </g>
        <path d="M0,512 C180,480 274,532 424,500 C604,462 724,514 1040,482 L1040,560 L0,560 Z" fill="rgba(79,113,123,0.28)"></path>
        <circle cx="642" cy="86" r="34" fill="rgba(255,244,180,0.68)"></circle>
      `;
    }
    if (world === "forest") {
      return `
        <rect x="0" y="0" width="1040" height="560" fill="#c8d6bd"></rect>
        <path d="M0,130 C170,72 302,142 454,92 C614,40 742,96 1040,52 L1040,0 L0,0 Z" fill="rgba(87,119,80,0.42)"></path>
        <path d="M0,520 C164,482 278,536 440,500 C612,462 778,520 1040,474 L1040,560 L0,560 Z" fill="rgba(76,112,74,0.24)"></path>
        ${treeRows([[54, 412], [134, 102], [214, 86], [812, 112], [904, 430], [966, 384], [726, 74], [486, 92]])}
      `;
    }
    return `
      <rect x="0" y="0" width="1040" height="560" fill="#d8d1c0"></rect>
      <path d="M0,420 C130,386 230,420 354,390 C500,354 620,398 760,366 C884,338 946,352 1040,326 L1040,560 L0,560 Z" fill="rgba(90,149,166,0.42)"></path>
      <path d="M0,442 C176,412 282,456 430,424 C574,394 730,438 1040,400" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="8"></path>
      <g opacity="0.82">
        <rect x="690" y="98" width="116" height="54" rx="8" fill="#b46452"></rect>
        <rect x="712" y="68" width="68" height="34" rx="6" fill="#d39b51"></rect>
        <rect x="720" y="116" width="28" height="36" fill="#604837"></rect>
        <path d="M836,142 l34,-58 l34,58 Z" fill="#d39b51"></path>
        <rect x="864" y="142" width="14" height="56" fill="#6d5140"></rect>
      </g>
    `;
  }

  function treeRows(trees) {
    return trees.map(([x, y]) => `
      <g transform="translate(${x} ${y})">
        <rect x="-5" y="14" width="10" height="26" rx="3" fill="#6d4f34"></rect>
        <path d="M0,-34 L28,18 L-28,18 Z" fill="#496f45"></path>
        <path d="M0,-14 L24,30 L-24,30 Z" fill="#5b8455"></path>
      </g>
    `).join("");
  }

  function carAngle(points, index) {
    const current = points[index] || points[0];
    const next = points[Math.min(points.length - 1, index + 1)] || current;
    const previous = points[Math.max(0, index - 1)] || current;
    const target = index >= points.length - 1 ? previous : next;
    return Math.atan2(target[1] - current[1], target[0] - current[0]) * 180 / Math.PI;
  }

  function laneSegmentSvg(points, segment) {
    const subset = points.slice(segment.from, segment.to + 1).map((point) => point.join(",")).join(" ");
    const dividerWidth = segment.lanes === 2 ? 22 : 0;
    return `
      <g>
        <polyline points="${subset}" fill="none" stroke="var(--road)" stroke-width="${segment.lanes === 2 ? 92 : 64}" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${dividerWidth ? `<polyline points="${subset}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-dasharray="14 14" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>` : ""}
      </g>
    `;
  }

  function nodeSvg(point, index) {
    const hazard = hazardAt(index);
    const fills = {
      spinner: "#ffe07f",
      skipper: "#87d8ff",
      sinker: "#bea0e9",
      steps: "#ffb56e",
      oil: "#b1bbc9",
      redflag: "#f19a93",
    };
    const fill = fills[hazard] || (state.track.safeSpots.has(index) ? "#d9e6c5" : "#fbfbfb");
    return `
      <g>
        <circle cx="${point[0]}" cy="${point[1]}" r="28" fill="rgba(0,0,0,0.12)"></circle>
        <circle cx="${point[0]}" cy="${point[1]}" r="24" fill="${fill}" stroke="rgba(255,255,255,0.84)" stroke-width="4"></circle>
        <text x="${point[0]}" y="${point[1] + 6}" text-anchor="middle" fill="#2d2d2d" font-size="17" font-weight="800">${index}</text>
      </g>
    `;
  }

  function hazardSvg(point, key, space) {
    const spec = HAZARD_INFO[key];
    if (!point || !spec) return "";

    const iconMarkup = spec.icon === "star"
      ? `<path d="M0,-16 L5,-5 L17,-5 L7,2 L10,15 L0,8 L-10,15 L-7,2 L-17,-5 L-5,-5 Z" fill="${spec.color}" stroke="#3a3a33" stroke-width="2"></path>`
      : spec.icon === "flag"
        ? `<path d="M-3,-18 L-3,16 M-3,-16 L17,-11 L-3,-3" fill="none" stroke="${spec.color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>`
        : spec.icon === "shield"
          ? `<path d="M0,-17 L15,-11 L12,8 L0,18 L-12,8 L-15,-11 Z" fill="${spec.color}" stroke="#3a3a33" stroke-width="2"></path>`
          : `<path d="M-14,14 L-14,5 L-6,5 L-6,-4 L3,-4 L3,-13 L14,-13" fill="none" stroke="${spec.color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>`;
    const resolvedIcon = spec.icon === "oil"
      ? `<g><ellipse cx="0" cy="10" rx="16" ry="9" fill="${spec.color}" stroke="#3a3a33" stroke-width="2"></ellipse><path d="M0,-14 C8,-4 9,1 0,8 C-9,1 -8,-4 0,-14 Z" fill="${spec.color}" stroke="#3a3a33" stroke-width="2"></path></g>`
      : spec.icon === "redflag"
        ? `<g><path d="M-5,-18 L-5,16" stroke="#3a3a33" stroke-width="3" stroke-linecap="round"></path><path d="M-3,-16 L16,-10 L-3,-3 Z" fill="${spec.color}" stroke="#3a3a33" stroke-width="2"></path></g>`
        : iconMarkup;
    return `
      <g transform="translate(${point[0]} ${point[1] - 42})">
        <rect x="-44" y="-46" width="88" height="22" rx="7" fill="rgba(255,255,255,0.92)" stroke="${spec.color}" stroke-width="2"></rect>
        <text x="-33" y="-30" fill="#263139" font-size="13" font-weight="900">${spec.short}</text>
        <text x="-16" y="-30" fill="#263139" font-size="12" font-weight="800">${spec.label.toUpperCase()}</text>
        <text x="34" y="-30" text-anchor="end" fill="#263139" font-size="12" font-weight="900">${space}</text>
        ${resolvedIcon}
      </g>
    `;
  }

  function carSvg(x, y, color, angle) {
    return `
      <g transform="translate(${x} ${y}) rotate(${angle})">
        <ellipse cx="0" cy="20" rx="24" ry="7" fill="rgba(0,0,0,0.26)"></ellipse>
        <path d="M-26,5 L-20,-10 C-12,-18 10,-20 22,-10 L28,5 C20,16 -18,16 -26,5 Z" fill="#161b22"></path>
        <path d="M-21,4 L-16,-8 C-10,-14 8,-16 18,-8 L23,4 C15,12 -14,12 -21,4 Z" fill="${color}"></path>
        <path d="M-8,-11 C-3,-16 7,-16 13,-10 L10,-2 L-11,-2 Z" fill="#cfe9ff" opacity="0.92"></path>
        <path d="M-16,-2 L17,-2" stroke="rgba(255,255,255,0.28)" stroke-width="2"></path>
        <path d="M-10,9 L11,9" stroke="rgba(0,0,0,0.18)" stroke-width="2"></path>
        <circle cx="-16" cy="10" r="6" fill="#111417"></circle>
        <circle cx="16" cy="10" r="6" fill="#111417"></circle>
        <circle cx="-16" cy="10" r="2.2" fill="#f7f7f7"></circle>
        <circle cx="16" cy="10" r="2.2" fill="#f7f7f7"></circle>
        <rect x="22" y="-2" width="9" height="4" rx="2" fill="#ffe592"></rect>
        <rect x="-29" y="-2" width="6" height="4" rx="2" fill="#ff8a7c"></rect>
      </g>
    `;
  }

  function renderStatus() {
    const player = currentPlayer();
    const raceRows = state.phase === "race"
      ? [
        `Turn: ${player ? player.name : "No race running"}`,
        `Race ${state.lobby.code || "None"} | ${state.lobby.players.length} racer${state.lobby.players.length === 1 ? "" : "s"} | ${TRACK_LAYOUTS[state.config.track].name}`,
        state.forceThree ? "Steps is active. Only 3-space moves remain." : state.feedback,
      ]
      : [
        `Turn: ${player ? player.name : "No race running"}`,
        `Race: ${state.lobby.code || "None"} | ${state.lobby.players.length} racer${state.lobby.players.length === 1 ? "" : "s"}`,
        `Question Set: ${MODE_NAMES[state.config.mode]}`,
        `Track Family: ${TRACK_LAYOUTS[state.config.track].name}`,
        `Hazards: ${hazardSummary()}`,
        lobbySync.remote
          ? `Server sync: live${lobbySync.lastSyncAt ? ` | ${formatClock(lobbySync.lastSyncAt)}` : ""}`
          : `Server sync: browser fallback${lobbySync.lastError ? ` | ${lobbySync.lastError}` : ""}`,
        state.feedback,
      ];

    const utilityActions = state.phase === "race"
      ? `
        <div class="utility-actions">
          <button class="ghost-btn utility-btn" id="leave-race-btn" type="button">Leave View</button>
          <button class="ghost-btn utility-btn" id="reset-race-btn" type="button"${localIsHost() ? "" : " disabled"}>Reset Race</button>
          <button class="ghost-btn utility-btn danger" id="close-race-inline-btn" type="button"${localIsHost() ? "" : " disabled"}>Close Race</button>
        </div>
      `
      : "";

    els.statusSummary.innerHTML = raceRows.map((line, index) => `
      <div class="info-card">${index === 0 ? `<strong>${escapeHtml(line)}</strong>` : escapeHtml(line)}</div>
    `).join("") + utilityActions;

    const leaveRaceBtn = els.statusSummary.querySelector("#leave-race-btn");
    if (leaveRaceBtn) leaveRaceBtn.addEventListener("click", leaveCurrentRace);
    const resetRaceBtn = els.statusSummary.querySelector("#reset-race-btn");
    if (resetRaceBtn) resetRaceBtn.addEventListener("click", resetToSetup);
    const closeRaceInlineBtn = els.statusSummary.querySelector("#close-race-inline-btn");
    if (closeRaceInlineBtn) closeRaceInlineBtn.addEventListener("click", closeCurrentRace);
  }

  function renderRoster() {
    const roster = state.players.length
      ? state.players
      : state.lobby.players.map((player, index) => ({
        ...PLAYER_STYLES[index],
        name: player.name,
        initials: player.name.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase(),
        isAi: false,
        position: 0,
        score: 0,
        correctAnswers: 0,
        brokenDown: false,
        shielded: false,
        timed: false,
      }));
    els.driverRoster.innerHTML = roster.map((player, index) => `
        <div class="driver-row${index === state.activeIndex && state.phase !== "setup" ? " active" : ""}">
          <div class="driver-row-title">
            <span style="color:${player.color}">${player.name} [${player.initials}]</span>
            <span class="badge">${player.isAi ? "AI" : "Human"}</span>
          </div>
          <div class="driver-meta">Position ${player.position} | Score ${player.score} | Correct ${player.correctAnswers}</div>
        <div class="driver-meta">${player.brokenDown ? "Broken down" : player.shielded ? "Shielded" : player.missNextTurn ? "Turn lost next round" : "Rolling"} | ${player.timed ? "Timed" : "Untimed"}</div>
      </div>
    `).join("");
  }

  function renderActivityFeed() {
    const entries = state.activityLog.slice().reverse();
    els.activityFeed.innerHTML = entries.length
      ? entries.map((entry) => `
        <div class="activity-entry ${escapeHtml(entry.kind || "info")}">
          <div class="activity-time">${escapeHtml(formatClock(entry.at))}</div>
          <div>${escapeHtml(entry.text)}</div>
        </div>
      `).join("")
      : `<div class="info-card muted">Race activity will appear here for both racers.</div>`;
  }

  function renderAdminPanel() {
    els.adminPanel.hidden = !state.adminOpen;
    els.adminToggleBtn.textContent = state.adminOpen ? "Hide Admin" : "Admin";
    els.adminToggleBtn.setAttribute("aria-expanded", state.adminOpen ? "true" : "false");
  }

  function toggleAdminPanel() {
    state.adminOpen = !state.adminOpen;
    render();
  }

  function renderRaceConsole(errorMessage = "") {
    if (errorMessage) {
      els.raceConsole.innerHTML = `
        <div class="race-console-card">
          <p class="eyebrow">Error</p>
          <h3>Unexpected problem</h3>
          <div class="error-banner">${escapeHtml(errorMessage)}</div>
        </div>
      `;
      return;
    }

    if (state.review) {
      els.raceConsole.innerHTML = `
        <div class="race-console-card">
          <div class="race-console-head">
            <div>
              <p class="eyebrow">${state.review.correct ? "Correct" : "Review"}</p>
              <h3>${escapeHtml(state.review.summary)}</h3>
            </div>
            <div class="race-console-meta"><span>${escapeHtml(state.review.playerName)}</span></div>
          </div>
          <div class="answer-review ${state.review.correct ? "success" : "error"}">
            <p><strong>Question:</strong> ${escapeHtml(state.review.prompt || "")}</p>
            <p><strong>Selected Answer:</strong> ${escapeHtml(state.review.selectedText || "")}</p>
            <p><strong>Correct Answer:</strong> ${escapeHtml(state.review.correctText || "")}</p>
            <strong>${escapeHtml(state.review.summary)}</strong>
            <p>${escapeHtml(state.review.explanation || state.feedback)}</p>
          </div>
          <div class="race-console-footer">
            <button id="continue-review-btn" class="primary-btn compact-btn" type="button">${state.phase === "gameOver" ? "Close Review" : "Continue"}</button>
          </div>
        </div>
      `;
      els.raceConsole.querySelector("#continue-review-btn").addEventListener("click", continueAfterReview);
      return;
    }

    if (state.phase === "answering" && state.currentQuestion) {
      const question = state.currentQuestion;
      const canControl = localCanControlTurn();
      const context = question.caseContext
        ? `<div class="case-context">${escapeHtml(question.caseContext)}</div>`
        : "";
      const waitingMessage = !currentPlayer().isAi && !canControl
        ? `<div class="info-card muted">${escapeHtml(currentPlayer().name)} is answering on another device.</div>`
        : currentPlayer().isAi
          ? `<div class="info-card muted">AI is answering...</div>`
          : "";
      els.raceConsole.innerHTML = `
        <div class="race-console-card">
          <div class="race-console-head">
            <div>
              <p class="eyebrow">${escapeHtml(currentPlayer().name)} answering</p>
              <h3>${escapeHtml(question.prompt)}</h3>
            </div>
            <div class="race-console-meta">
              <span>${escapeHtml(question.moduleName)}</span>
              <span>Difficulty ${question.difficulty + 1}</span>
              <span>Move ${question.move}</span>
            </div>
          </div>
          ${context}
          <div class="source-ref">${escapeHtml(question.sourceRef || "")}</div>
          <div class="race-console-options"></div>
          ${waitingMessage}
        </div>
      `;
      const optionsEl = els.raceConsole.querySelector(".race-console-options");
      if (!waitingMessage) {
        question.options.forEach((option, index) => {
          const button = document.createElement("button");
          button.className = "answer-option compact-option";
          button.type = "button";
          button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option.text)}`;
          button.addEventListener("click", () => submitAnswer(option.id));
          optionsEl.append(button);
        });
      }
      return;
    }

    if (state.phase === "chooseMove" && currentPlayer()) {
      const player = currentPlayer();
      const canControl = localCanControlTurn();
      const waiting = !player.isAi && !canControl
        ? `<div class="info-card muted">${escapeHtml(player.name)} is choosing a move on another device.</div>`
        : player.isAi
          ? `<div class="info-card muted">AI is choosing a move...</div>`
          : "";
      els.raceConsole.innerHTML = `
        <div class="race-console-card">
          <div class="race-console-head">
            <div>
              <p class="eyebrow">Choose move</p>
              <h3>${escapeHtml(player.name)}: pick your distance</h3>
            </div>
            <div class="race-console-meta">
              <span>${state.forceThree ? "Steps active" : "Choose 1, 2, or 3 spaces"}</span>
            </div>
          </div>
          <div class="info-card">${escapeHtml(player.name)} will answer a question for the selected move.</div>
          <div class="move-controls compact-move-controls"></div>
          ${waiting}
        </div>
      `;
      const controlsEl = els.raceConsole.querySelector(".compact-move-controls");
      if (!waiting) {
        MOVE_OPTIONS.forEach((move) => {
          const button = document.createElement("button");
          button.className = "primary-btn move-btn compact-btn";
          button.type = "button";
          button.textContent = `${move}`;
          const reachesFinish = player.position + move >= FINISH_INDEX;
          button.disabled = state.forceThree && move !== 3 && !reachesFinish;
          button.addEventListener("click", () => askQuestion(move));
          controlsEl.append(button);
        });
      }
      return;
    }

    els.raceConsole.innerHTML = `
      <div class="race-console-card">
        <p class="eyebrow">Race Console</p>
        <h3>${escapeHtml(state.phase === "setup" ? "Start the race to open the question console." : state.feedback)}</h3>
        <div class="info-card muted">Questions, answers, and review stay visible here for both racers while the map remains open.</div>
      </div>
    `;
  }

  function renderLobby() {
    const localPlayer = localLobbyPlayer();
    const hostControlsEnabled = !state.lobby.active || localIsHost();
    els.lobbyCode.textContent = state.lobby.code || "No Race";
    els.lobbyStatus.textContent = state.lobby.active
      ? `${state.lobby.players.length} racer${state.lobby.players.length === 1 ? "" : "s"} attached to race ${state.lobby.code}.`
      : "Create a race or open an existing one.";
    els.startRaceBtn.disabled = !state.lobby.active || (localPlayer && !localPlayer.host);

    const lobbies = Object.values(readLobbyRegistry())
      .filter((lobby) => lobby && lobby.code)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    els.availableLobbies.innerHTML = lobbies.length
      ? lobbies.map((lobby) => {
        return `
          <div class="available-lobby${lobby.code === state.lobby.code ? " active" : ""}">
            <button class="available-lobby-main" type="button" data-code="${escapeHtml(lobby.code)}">
              <strong>${escapeHtml(lobby.code)}</strong>
              <span>${lobby.players.length} racer${lobby.players.length === 1 ? "" : "s"} | ${escapeHtml(lobby.trackKey || "track pending")}</span>
            </button>
            <button class="ghost-btn danger available-lobby-delete" type="button" data-delete-code="${escapeHtml(lobby.code)}"${hostControlsEnabled ? "" : " disabled"}>Delete</button>
          </div>
        `;
      }).join("")
      : `<div class="info-card muted">No saved races are currently listed.</div>`;
    els.availableLobbies.querySelectorAll(".available-lobby-main").forEach((button) => {
      button.addEventListener("click", () => {
        els.joinCode.value = button.dataset.code;
        joinLobby();
      });
    });
    els.availableLobbies.querySelectorAll(".available-lobby-delete").forEach((button) => {
      button.addEventListener("click", () => {
        deleteLobby(button.dataset.deleteCode);
      });
    });

    els.lobbyPlayers.innerHTML = state.lobby.players.length
      ? state.lobby.players.map((player) => {
        return `
          <div class="lobby-player ready">
            <strong>${escapeHtml(player.name)}</strong>
            <span>${player.host ? "Host" : "Player"}</span>
          </div>
        `;
      }).join("")
      : `<div class="info-card muted">No players in lobby.</div>`;
  }

  function renderHazardLegend() {
    const grouped = HAZARD_KEYS.map((key) => ({
      key,
      spaces: cloneHazards(state.track.hazards)
        .filter((hazard) => hazard.type === key)
        .map((hazard) => hazard.space)
        .sort((a, b) => a - b),
    }));

    els.hazardLegend.innerHTML = grouped.map(({ key, spaces }) => {
      const hazard = HAZARD_INFO[key];
      return `
        <div class="hazard-row">
          <span class="hazard-token" style="background:${hazard.color}">${hazard.short}</span>
          <div>
            <strong>${hazard.label}${spaces.length ? ` ${spaces.join(", ")}` : ""}</strong>
            <div class="muted">${hazard.effect}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function hazardSummary() {
    return HAZARD_KEYS.map((key) => {
      const spaces = cloneHazards(state.track.hazards)
        .filter((hazard) => hazard.type === key)
        .map((hazard) => hazard.space)
        .sort((a, b) => a - b);
      return `${HAZARD_INFO[key].short} ${spaces.length ? spaces.join("/") : "-"}`;
    }).join(", ");
  }

  function render() {
    const hostControlsEnabled = !state.lobby.active || localIsHost();
    applyTheme();
    syncThemeControls();
    document.body.dataset.phase = state.phase === "lobby" ? "lobby" : state.phase === "setup" ? "setup" : "race";
    els.releaseNote.textContent = `Release ${APP_META.release} | rev ${APP_META.revision} | ${APP_META.label} | Updated ${APP_META.updatedOn}`;
    els.newRaceBtn.hidden = state.phase === "race";
    els.playerCount.disabled = !hostControlsEnabled;
    els.humanCount.disabled = !hostControlsEnabled;
    els.modeSelect.disabled = !hostControlsEnabled;
    els.trackSelect.disabled = !hostControlsEnabled;
    els.themeSelect.disabled = !hostControlsEnabled;
    els.themeButtons.forEach((button) => {
      button.disabled = !hostControlsEnabled;
    });
    els.randomizeTrackBtn.disabled = !hostControlsEnabled;
    els.closeRaceBtn.disabled = !state.lobby.active || !hostControlsEnabled;
    els.newRaceBtn.disabled = state.lobby.active && !hostControlsEnabled;
    renderAdminPanel();
    renderLobby();
    renderBoard();
    renderStatus();
    renderRoster();
    renderActivityFeed();
    renderRaceConsole();
    renderHazardLegend();
  }

  function styleForIndex(index) {
    if (PLAYER_STYLES[index]) return PLAYER_STYLES[index];
    const hue = (index * 47) % 360;
    return {
      name: `Car ${index + 1}`,
      color: `hsl(${hue} 62% 52%)`,
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function formatClock(timestamp) {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  }

  window.addEventListener("error", (event) => {
    showError(`${event.message}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    showError(String(event.reason || "Unhandled promise rejection"));
  });

  function showError(message) {
    state.feedback = message;
    renderRaceConsole(message);
  }

  async function closeCurrentRace() {
    if (!state.lobby.active || !state.lobby.code) {
      state.feedback = "No current race is open.";
      render();
      return;
    }
    const code = state.lobby.code;
    if (!lobbySync.remote) {
      await deleteLobby(code);
      return;
    }
    try {
      await postLobbyAction("close");
      state.feedback = `Race ${code} closed.`;
      render();
    } catch (error) {
      state.feedback = error.message;
      render();
    }
  }

  async function deleteLobby(code) {
    if (!code) return;
    if (lobbySync.remote) {
      try {
        const response = await fetch(`${LOBBY_API_URL}/${encodeURIComponent(code)}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error(`Lobby delete returned ${response.status}`);
        const payload = await response.json();
        lobbySync.registry = payload && payload.lobbies && typeof payload.lobbies === "object"
          ? payload.lobbies
          : {};
        lobbySync.lastError = "";
        lobbySync.lastSyncAt = Date.now();
      } catch (error) {
        state.feedback = `Could not remove race ${code}. ${error && error.message ? error.message : "Delete failed."}`;
        render();
        return;
      }
    } else {
      const registry = readLobbyRegistry();
      delete registry[code];
      writeLobbyRegistry(registry);
    }

    if (state.lobby.code === code) {
      state.lobby = {
        active: false,
        code: "",
        revision: 0,
        configVersion: 0,
        players: [],
      };
      state.phase = "lobby";
      state.players = [];
      state.placements = [];
      state.review = null;
      state.activityLog = [];
      rebuildDriverConfig();
    }
    state.feedback = `Race ${code} removed.`;
    render();
  }

  initControls();
  rebuildDriverConfig();
  applyTheme();
  render();
}());
