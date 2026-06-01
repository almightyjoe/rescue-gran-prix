(function () {
  "use strict";

  const TRACK_LENGTH = 30;
  const FINISH_INDEX = TRACK_LENGTH - 1;
  const FIRST_CROSSING_INDEX = 6;
  const MOVE_OPTIONS = [1, 2, 3];
  const DIFFICULTY_POINTS = [1, 2, 3, 4, 5];
  const PLACEMENT_BONUS = [15, 8, 4, 0];
  const HAZARD_KEYS = ["spinner", "skipper", "sinker", "steps"];
  const LOBBY_STORAGE_KEY = "rescue-gran-prix-lobbies-v1";
  const LOBBY_API_URL = "./api/lobbies";
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
  };

  const lobbySync = {
    remote: false,
    checked: false,
    registry: {},
    lastError: "",
  };

  const els = {
    playerName: document.querySelector("#player-name"),
    joinCode: document.querySelector("#join-code"),
    createRaceBtn: document.querySelector("#create-race-btn"),
    joinRaceBtn: document.querySelector("#join-race-btn"),
    readyRaceBtn: document.querySelector("#ready-race-btn"),
    lobbyCode: document.querySelector("#lobby-code"),
    lobbyStatus: document.querySelector("#lobby-status"),
    lobbyPlayers: document.querySelector("#lobby-players"),
    availableLobbies: document.querySelector("#available-lobbies"),
    playerCount: document.querySelector("#player-count"),
    humanCount: document.querySelector("#human-count"),
    modeSelect: document.querySelector("#mode-select"),
    trackSelect: document.querySelector("#track-select"),
    themeSelect: document.querySelector("#theme-select"),
    driverConfig: document.querySelector("#driver-config"),
    startRaceBtn: document.querySelector("#start-race-btn"),
    newRaceBtn: document.querySelector("#new-race-btn"),
    randomizeTrackBtn: document.querySelector("#randomize-track-btn"),
    boardStage: document.querySelector("#board-stage"),
    statusSummary: document.querySelector("#status-summary"),
    driverRoster: document.querySelector("#driver-roster"),
    promptTitle: document.querySelector("#prompt-title"),
    promptBody: document.querySelector("#prompt-body"),
    moveControls: document.querySelector("#move-controls"),
    answerControls: document.querySelector("#answer-controls"),
    hazardLegend: document.querySelector("#hazard-legend"),
    resultsBody: document.querySelector("#results-body"),
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

  function buildTrackInstance(layoutKey) {
    const family = TRACK_LAYOUTS[layoutKey].family;
    const templates = TRACK_LIBRARY[family];
    const template = templates[randInt(0, templates.length - 1)];
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
    return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function initControls() {
    initLobbyFieldsFromUrl();
    for (let value = 2; value <= 4; value += 1) {
      els.playerCount.append(new Option(String(value), String(value)));
    }
    for (let value = 1; value <= 4; value += 1) {
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
    els.themeSelect.value = state.config.theme;

    els.playerCount.addEventListener("change", () => {
      state.config.players = Number(els.playerCount.value);
      state.config.humans = clamp(state.config.humans, 1, state.config.players);
      els.humanCount.value = String(state.config.humans);
      invalidateLobbyReady();
      rebuildDriverConfig();
      render();
    });

    els.humanCount.addEventListener("change", () => {
      state.config.humans = clamp(Number(els.humanCount.value), 1, state.config.players);
      invalidateLobbyReady();
      rebuildDriverConfig();
      render();
    });

    els.modeSelect.addEventListener("change", () => {
      state.config.mode = Number(els.modeSelect.value);
      invalidateLobbyReady();
      render();
    });

    els.trackSelect.addEventListener("change", () => {
      state.config.track = els.trackSelect.value;
      state.track = buildTrackInstance(state.config.track);
      invalidateLobbyReady();
      render();
    });

    els.themeSelect.addEventListener("change", () => {
      state.config.theme = els.themeSelect.value;
      invalidateLobbyReady();
      applyTheme();
      render();
    });

    els.createRaceBtn.addEventListener("click", createLobby);
    els.joinRaceBtn.addEventListener("click", joinLobby);
    els.readyRaceBtn.addEventListener("click", toggleReady);
    els.startRaceBtn.addEventListener("click", startRace);
    els.newRaceBtn.addEventListener("click", resetToSetup);
    els.randomizeTrackBtn.addEventListener("click", randomizeCurrentTrack);
    window.addEventListener("storage", (event) => {
      if (event.key !== LOBBY_STORAGE_KEY || !state.lobby.active) return;
      const latest = readLobby(state.lobby.code);
      if (latest) {
        loadLobby(latest);
        render();
      }
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
    const name = normalizedPlayerName();
    const code = normalizedLobbyCode() || randomLobbyCode();
    if (readLobby(code)) {
      state.feedback = `Race ${code} already exists. Join it or choose another code.`;
      render();
      return;
    }
    state.lobby = {
      active: true,
      code,
      configVersion: 1,
      players: [
        {
          id: state.clientId,
          name,
          readyVersion: 0,
          host: true,
        },
      ],
    };
    state.phase = "setup";
    syncConfigToLobby();
    saveCurrentLobby();
    state.feedback = `${name} created race ${state.lobby.code}.`;
    rebuildDriverConfig();
    render();
  }

  async function joinLobby() {
    await refreshRemoteLobbies();
    const code = normalizedLobbyCode();
    const localName = normalizedPlayerName();
    if (!code) {
      state.feedback = "Enter a race code or double-click an available race.";
      render();
      return;
    }
    const lobby = readLobby(code);
    if (!lobby) {
      state.feedback = `Race ${code} was not found. Create it first or join an available race.`;
      render();
      return;
    }
    if (!lobby.players.some((player) => player.id === state.clientId) && lobby.players.length >= 4) {
      state.feedback = `Race ${code} is full.`;
      render();
      return;
    }
    loadLobby(lobby);
    upsertLobbyPlayer(state.clientId, localName, state.lobby.players.length === 0);
    state.phase = "setup";
    syncConfigToLobby();
    saveCurrentLobby();
    state.feedback = `${localName} joined race ${state.lobby.code}.`;
    rebuildDriverConfig();
    render();
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
    if (!state.lobby.active) {
      state.feedback = "Create or join a race before marking ready.";
      render();
      return;
    }
    const localPlayer = localLobbyPlayer();
    if (!localPlayer) return;
    localPlayer.readyVersion = localPlayer.readyVersion === state.lobby.configVersion ? 0 : state.lobby.configVersion;
    saveCurrentLobby();
    render();
  }

  function localLobbyPlayer() {
    const name = normalizedPlayerName();
    return state.lobby.players.find((player) => player.name === name)
      || state.lobby.players.find((player) => player.id === state.clientId);
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

  function syncConfigToLobby() {
    const humans = Math.max(1, state.lobby.players.length);
    state.config.players = clamp(Math.max(2, humans), 2, 4);
    state.config.humans = clamp(humans, 1, state.config.players);
    els.playerCount.value = String(state.config.players);
    els.humanCount.value = String(state.config.humans);
  }

  function invalidateLobbyReady() {
    if (!state.lobby.active) return;
    state.lobby.configVersion += 1;
    state.lobby.players.forEach((player) => {
      player.readyVersion = 0;
    });
    saveCurrentLobby();
  }

  function lobbyIsReady() {
    return state.lobby.active
      && state.lobby.players.length > 0
      && state.lobby.players.every((player) => player.readyVersion === state.lobby.configVersion);
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

  function initRemoteLobbySync() {
    refreshRemoteLobbies();
    window.setInterval(refreshRemoteLobbies, 1600);
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

      if (state.lobby.active && (state.phase === "setup" || state.phase === "lobby")) {
        const latest = readLobby(state.lobby.code);
        if (latest) {
          loadLobby(latest);
          rebuildDriverConfig();
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
      if (!response.ok) throw new Error(`Lobby save returned ${response.status}`);
      const payload = await response.json();
      if (payload && payload.lobbies && typeof payload.lobbies === "object") {
        lobbySync.registry = payload.lobbies;
      }
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
    };
    registry[state.lobby.code] = savedLobby;
    writeLobbyRegistry(registry);
    persistRemoteLobby(savedLobby);
  }

  function loadLobby(lobby) {
    state.lobby = {
      active: true,
      code: lobby.code,
      configVersion: lobby.configVersion || 1,
      players: Array.isArray(lobby.players) ? lobby.players : [],
    };
    if (lobby.config) {
      state.config = {
        ...state.config,
        ...lobby.config,
      };
      els.playerCount.value = String(state.config.players);
      els.humanCount.value = String(state.config.humans);
      els.modeSelect.value = String(state.config.mode);
      els.trackSelect.value = state.config.track;
      els.themeSelect.value = state.config.theme;
      state.track = buildTrackInstance(state.config.track);
      if (lobby.hazards) {
        state.track.hazards = cloneHazards(lobby.hazards);
      }
    }
  }

  function cloneHazards(hazards) {
    if (Array.isArray(hazards)) {
      return hazards.map((hazard) => ({ ...hazard }));
    }
    return Object.entries(hazards || {}).map(([type, space]) => ({ type, space }));
  }

  function applyTheme() {
    const root = document.documentElement;
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
    } else {
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
    for (let index = 0; index < state.config.players; index += 1) {
      const player = PLAYER_STYLES[index];
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
      controller.value = index < state.config.humans ? "human" : "ai";
      controller.addEventListener("change", syncHumanCountFromControllers);
      card.dataset.index = String(index);
      els.driverConfig.append(card);
    }
  }

  function syncHumanCountFromControllers() {
    const cards = [...els.driverConfig.querySelectorAll(".driver-card")];
    const humans = cards.filter((card) => card.querySelector(".driver-controller").value === "human").length;
    state.config.humans = clamp(humans, 1, state.config.players);
    els.humanCount.value = String(state.config.humans);
    invalidateLobbyReady();
  }

  function startRace() {
    if (state.lobby.active && !lobbyIsReady()) {
      state.feedback = "All lobby players must be ready before the race starts.";
      render();
      return;
    }
    const cards = [...els.driverConfig.querySelectorAll(".driver-card")];
    state.players = cards.map((card, index) => {
      const style = PLAYER_STYLES[index];
      const lobbyPlayer = state.lobby.players[index];
      const isAi = card.querySelector(".driver-controller").value === "ai";
      const initialsValue = card.querySelector(".driver-initials").value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      return {
        ...style,
        name: lobbyPlayer && !isAi ? lobbyPlayer.name : style.name,
        initials: isAi ? "CPU" : (initialsValue || style.name.slice(0, 3).toUpperCase()),
        isAi,
        timed: card.querySelector(".driver-timed").checked,
        position: 0,
        score: 0,
        correctAnswers: 0,
        shielded: false,
        brokenDown: false,
        skipNextSelection: false,
      };
    });

    state.activeIndex = 0;
    state.phase = "chooseMove";
    state.currentQuestion = null;
    state.askedQuestionIds.clear();
    state.feedback = "Race started. Choose a move, then answer an EMT question.";
    state.forceThree = false;
    state.placements = [];
    state.track = buildTrackInstance(state.config.track);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (currentPlayer().isAi) {
      queueAiTurn();
    }
  }

  function resetToSetup() {
    state.phase = state.lobby.active ? "setup" : "lobby";
    state.currentQuestion = null;
    state.askedQuestionIds.clear();
    state.feedback = "Set up the next race.";
    state.players = [];
    state.placements = [];
    state.track = buildTrackInstance(state.config.track);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function askQuestion(move) {
    const player = currentPlayer();
    const repair = player.brokenDown;
    state.currentQuestion = {
      ...generateQuestion(player, move, repair),
      move,
      repair,
    };
    state.phase = "answering";
    state.feedback = repair
      ? `${player.name} needs a repair answer.`
      : `${player.name} is answering for ${move} space${move === 1 ? "" : "s"}.`;
    render();
    if (player.isAi) {
      queueAiAnswer();
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

  function submitAnswer(rawValue) {
    const player = currentPlayer();
    const expected = state.currentQuestion.answer;
    const selectedOption = state.currentQuestion.options.find((option) => option.id === rawValue);
    const correct = rawValue === expected;

    if (correct) {
      const points = awardPoints(player, state.currentQuestion.difficulty, state.currentQuestion.move);
      if (state.currentQuestion.repair) {
        player.brokenDown = false;
        state.feedback = `${player.name} repaired the car. +${points} points.`;
      } else {
        applyMove(player, state.currentQuestion.move, points);
      }
    } else {
      const detail = selectedOption && selectedOption.explanation ? ` ${selectedOption.explanation}` : "";
      state.feedback = `Incorrect. Correct answer: ${state.currentQuestion.correctText}.${detail}`;
    }

    state.currentQuestion = null;
    if (state.phase !== "gameOver") {
      nextTurn();
    }
    render();
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
  }

  function nextTurn() {
    const player = currentPlayer();
    if (player.skipNextSelection) {
      player.skipNextSelection = false;
      state.phase = "chooseMove";
    } else {
      state.activeIndex = (state.activeIndex + 1) % state.players.length;
      state.phase = "chooseMove";
    }
    if (currentPlayer().isAi) {
      queueAiTurn();
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
          <polyline points="${path}" fill="none" stroke="rgba(35,38,38,0.2)" stroke-width="104" stroke-linecap="round" stroke-linejoin="round"></polyline>
          <polyline points="${path}" fill="none" stroke="var(--road)" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"></polyline>
          <polyline points="${path}" fill="none" stroke="var(--road-edge)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></polyline>
          ${laneMarkup}
        </g>
        <g>
          <rect x="806" y="34" width="198" height="58" rx="16" fill="rgba(255,251,241,0.9)" stroke="var(--panel-border)" stroke-width="2"></rect>
          <text x="905" y="58" text-anchor="middle" fill="var(--text)" font-size="18" font-weight="800">${escapeHtml(TRACK_LAYOUTS[state.config.track].name)}</text>
          <text x="905" y="78" text-anchor="middle" fill="var(--muted)" font-size="12">${escapeHtml(state.track.templateKey)}</text>
        </g>
        <g>
          <rect x="36" y="34" width="132" height="84" rx="18" fill="rgba(255,251,241,0.92)" stroke="var(--panel-border)" stroke-width="2"></rect>
          <text x="54" y="66" fill="var(--text)" font-size="20" font-weight="700">FINISH</text>
          <g transform="translate(52 88)">
            ${[0, 1, 2, 3].map((i) => `<rect x="${i * 18}" y="0" width="10" height="32" fill="${i % 2 === 0 ? "#222" : "#f2f2f2"}"></rect>`).join("")}
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
    return `
      <g transform="translate(${point[0]} ${point[1] - 42})">
        <rect x="-44" y="-46" width="88" height="22" rx="7" fill="rgba(255,255,255,0.92)" stroke="${spec.color}" stroke-width="2"></rect>
        <text x="-33" y="-30" fill="#263139" font-size="13" font-weight="900">${spec.short}</text>
        <text x="-16" y="-30" fill="#263139" font-size="12" font-weight="800">${spec.label.toUpperCase()}</text>
        <text x="34" y="-30" text-anchor="end" fill="#263139" font-size="12" font-weight="900">${space}</text>
        ${iconMarkup}
      </g>
    `;
  }

  function carSvg(x, y, color, angle) {
    return `
      <g transform="translate(${x} ${y}) rotate(${angle})">
        <ellipse cx="0" cy="18" rx="22" ry="6" fill="rgba(0,0,0,0.24)"></ellipse>
        <path d="M-22,-10 C-10,-20 12,-20 24,-8 L28,8 C14,18 -12,18 -28,8 Z" fill="#22272c"></path>
        <path d="M-18,-8 C-8,-15 10,-15 20,-6 L22,7 C10,14 -10,14 -22,7 Z" fill="${color}"></path>
        <path d="M-5,-14 L9,-12 L14,-4 L-10,-4 Z" fill="#dff4ff" opacity="0.9"></path>
        <circle cx="-16" cy="11" r="6" fill="#151719"></circle>
        <circle cx="16" cy="11" r="6" fill="#151719"></circle>
        <circle cx="-16" cy="11" r="2" fill="#ffffff"></circle>
        <circle cx="16" cy="11" r="2" fill="#ffffff"></circle>
        <path d="M24,-5 L34,0 L24,5 Z" fill="#ffe681"></path>
      </g>
    `;
  }

  function renderStatus() {
    const player = currentPlayer();
    const readyText = state.lobby.active
      ? `${state.lobby.players.filter((entry) => entry.readyVersion === state.lobby.configVersion).length}/${state.lobby.players.length} ready`
      : "No lobby";
    const rows = [
      `Turn: ${player ? player.name : "No race running"}`,
      `Lobby: ${state.lobby.code || "None"} | ${readyText}`,
      `Question Set: ${MODE_NAMES[state.config.mode]}`,
      `Track Family: ${TRACK_LAYOUTS[state.config.track].name}`,
      `Template: ${state.track.templateKey}`,
      `Hazards: ${hazardSummary()}`,
      state.forceThree ? "Steps is active. Only 3-space moves remain." : "Choose 1, 2, or 3 spaces before answering.",
      state.feedback,
    ];

    const newRaceAction = state.phase === "setup" || state.phase === "lobby"
      ? ""
      : `<button class="ghost-btn status-new-race" type="button">New Race</button>`;

    els.statusSummary.innerHTML = rows.map((line, index) => `
      <div class="info-card">${index === 0 ? `<strong>${escapeHtml(line)}</strong>` : escapeHtml(line)}</div>
    `).join("") + newRaceAction;

    const statusNewRace = els.statusSummary.querySelector(".status-new-race");
    if (statusNewRace) {
      statusNewRace.addEventListener("click", resetToSetup);
    }
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
        <div class="driver-meta">${player.brokenDown ? "Broken down" : player.shielded ? "Shielded" : "Rolling"} | ${player.timed ? "Timed" : "Untimed"}</div>
      </div>
    `).join("");
  }

  function renderPrompt() {
    els.moveControls.innerHTML = "";
    els.answerControls.innerHTML = "";
    els.promptBody.innerHTML = "";

    if (state.phase === "lobby") {
      els.promptTitle.textContent = "Lobby";
      els.promptBody.innerHTML = `
        <div class="info-card">Create a race or join with a race code.</div>
      `;
      return;
    }

    if (state.phase === "setup") {
      els.promptTitle.textContent = "Ready";
      const ready = lobbyIsReady();
      els.promptBody.innerHTML = `
        <div class="info-card">${ready ? "All players are ready." : "Configuration changes require everyone to ready up again."}</div>
        <div class="info-card">Use Randomize Hazards to keep the selected map and reshuffle special spaces.</div>
      `;
      return;
    }

    if (state.phase === "chooseMove") {
      els.promptTitle.textContent = "Choose Distance";
      els.promptBody.innerHTML = `
        <div class="info-card"><strong>${escapeHtml(currentPlayer().name)}</strong>: choose how far to move.</div>
      `;
      if (!currentPlayer().isAi) {
        MOVE_OPTIONS.forEach((move) => {
          const button = document.createElement("button");
          button.className = "primary-btn move-btn";
          button.textContent = `${move}`;
          const reachesFinish = currentPlayer().position + move >= FINISH_INDEX;
          button.disabled = state.forceThree && move !== 3 && !reachesFinish;
          button.addEventListener("click", () => askQuestion(move));
          els.moveControls.append(button);
        });
      } else {
        els.promptBody.innerHTML += `<div class="info-card muted">AI is choosing a move...</div>`;
      }
      return;
    }

    if (state.phase === "answering") {
      els.promptTitle.textContent = "Respond";
      const context = state.currentQuestion.caseContext
        ? `<div class="case-context">${escapeHtml(state.currentQuestion.caseContext)}</div>`
        : "";
      els.promptBody.innerHTML = `
        <div class="question-card">
          ${context}
          <strong>${escapeHtml(state.currentQuestion.prompt)}</strong>
          <div class="muted">${escapeHtml(state.currentQuestion.moduleName)} | Difficulty ${state.currentQuestion.difficulty + 1} | Move ${state.currentQuestion.move}</div>
          <div class="source-ref">${escapeHtml(state.currentQuestion.sourceRef)}</div>
        </div>
      `;
      if (!currentPlayer().isAi) {
        state.currentQuestion.options.forEach((option, index) => {
          const button = document.createElement("button");
          button.className = "answer-option";
          button.type = "button";
          button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option.text)}`;
          button.addEventListener("click", () => submitAnswer(option.id));
          els.answerControls.append(button);
        });
      } else {
        els.answerControls.innerHTML = `<div class="muted">AI is answering...</div>`;
      }
      return;
    }

    if (state.phase === "gameOver") {
      els.promptTitle.textContent = "Results";
      const results = state.placements.map((player, index) => `<li>${index + 1}. ${player.initials} ${player.name} - ${player.score} pts</li>`).join("");
      els.promptBody.innerHTML = `
        <div class="info-card"><strong>${escapeHtml(state.feedback)}</strong></div>
        <div class="score-list">
          <h3>Final Standings</h3>
          <ol>${results}</ol>
        </div>
      `;
    }
  }

  function renderResults() {
    const standings = state.lastRace.length
      ? `<ol>${state.lastRace.map((record) => `<li>${record.initials} ${escapeHtml(record.name)} - ${record.score} pts (${escapeHtml(record.track)})</li>`).join("")}</ol>`
      : `<p class="muted">No completed race yet.</p>`;

    els.resultsBody.innerHTML = `
      <div class="score-list">
        <h3>Latest Finish</h3>
        ${standings}
      </div>
      <div class="info-card muted">This website version keeps results only for the current browser session.</div>
    `;
  }

  function renderLobby() {
    els.lobbyCode.textContent = state.lobby.code || "No Race";
    const readyCount = state.lobby.players.filter((player) => player.readyVersion === state.lobby.configVersion).length;
    const scope = lobbySync.remote ? "server lobby" : "this device only";
    els.lobbyStatus.textContent = state.lobby.active
      ? `${readyCount}/${state.lobby.players.length} ready | ${scope}`
      : `Create or join a race lobby. Scope: ${scope}.`;
    els.readyRaceBtn.disabled = !state.lobby.active;
    const localPlayer = localLobbyPlayer();
    els.readyRaceBtn.textContent = localPlayer && localPlayer.readyVersion === state.lobby.configVersion
      ? "Ready ✓"
      : "Ready";
    els.startRaceBtn.disabled = state.lobby.active && !lobbyIsReady();

    const lobbies = Object.values(readLobbyRegistry())
      .filter((lobby) => lobby && lobby.code)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    els.availableLobbies.innerHTML = lobbies.length
      ? lobbies.map((lobby) => {
        const ready = lobby.players.filter((player) => player.readyVersion === lobby.configVersion).length;
        return `
          <button class="available-lobby${lobby.code === state.lobby.code ? " active" : ""}" type="button" data-code="${escapeHtml(lobby.code)}">
            <strong>${escapeHtml(lobby.code)}</strong>
            <span>${lobby.players.length}/4 players | ${ready}/${lobby.players.length} ready</span>
          </button>
        `;
      }).join("")
      : `<div class="info-card muted">No races are currently posted ${lobbySync.remote ? "on this server" : "in this browser"}.</div>`;
    els.availableLobbies.querySelectorAll(".available-lobby").forEach((button) => {
      const join = () => {
        els.joinCode.value = button.dataset.code;
        joinLobby();
      };
      button.addEventListener("dblclick", join);
      button.addEventListener("click", () => {
        els.joinCode.value = button.dataset.code;
      });
    });

    els.lobbyPlayers.innerHTML = state.lobby.players.length
      ? state.lobby.players.map((player) => {
        const ready = player.readyVersion === state.lobby.configVersion;
        return `
          <div class="lobby-player${ready ? " ready" : ""}">
            <strong>${escapeHtml(player.name)}</strong>
            <span>${player.host ? "Host" : "Player"} | ${ready ? "Ready" : "Not Ready"}</span>
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
    applyTheme();
    document.body.dataset.phase = state.phase === "lobby" ? "lobby" : state.phase === "setup" ? "setup" : "race";
    renderLobby();
    renderBoard();
    renderStatus();
    renderRoster();
    renderPrompt();
    renderHazardLegend();
    renderResults();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  window.addEventListener("error", (event) => {
    showError(`${event.message}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    showError(String(event.reason || "Unhandled promise rejection"));
  });

  function showError(message) {
    els.promptTitle.textContent = "Error";
    els.promptBody.innerHTML = `<div class="error-banner">${escapeHtml(message)}</div>`;
  }

  initControls();
  rebuildDriverConfig();
  applyTheme();
  render();
}());
