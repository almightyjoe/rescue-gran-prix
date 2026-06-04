import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const host = process.env.HOST || "0.0.0.0";
const preferredPort = Number(process.env.PORT || 3040);
const maxPortAttempts = Number(process.env.PORT_ATTEMPTS || 25);
const lobbyTtlMs = Number(process.env.LOBBY_TTL_MS || 6 * 60 * 60 * 1000);
const lobbies = new Map();
const streamClients = new Set();
const TRACK_LENGTH = 30;
const FINISH_INDEX = TRACK_LENGTH - 1;
const FIRST_CROSSING_INDEX = 6;
const MAX_PLAYERS = 8;
const MOVE_OPTIONS = [1, 2, 3];
const DIFFICULTY_POINTS = [1, 2, 3, 4, 5];
const PLACEMENT_BONUS = [15, 8, 4, 0];
const HAZARD_KEYS = ["spinner", "skipper", "sinker", "steps", "oil", "redflag"];
const SAFE_SPOTS = new Set([6, 12, 18, 24]);
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
const RESCUE_QUESTIONS = loadQuestionBank();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function pruneLobbies() {
  const now = Date.now();
  for (const [code, lobby] of lobbies.entries()) {
    if (!lobby.updatedAt || now - lobby.updatedAt > lobbyTtlMs) {
      lobbies.delete(code);
    }
  }
}

function registryObject() {
  pruneLobbies();
  return Object.fromEntries([...lobbies.entries()].sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)));
}

function broadcastLobbies() {
  const payload = `data: ${JSON.stringify({ lobbies: registryObject() })}\n\n`;
  for (const client of streamClients) {
    try {
      client.write(payload);
    } catch {
      streamClients.delete(client);
    }
  }
}

function loadQuestionBank() {
  const source = readFileSync(join(root, "questions.js"), "utf-8");
  const match = source.match(/window\.RESCUE_QUESTIONS\s*=\s*(\[.*\]);?\s*$/s);
  if (!match) {
    throw new Error("Could not parse Rescue Gran Prix question bank.");
  }
  return JSON.parse(match[1]);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function cloneHazards(hazards) {
  return Array.isArray(hazards) ? hazards.map((hazard) => ({ ...hazard })) : [];
}

function makeGameState(lobby) {
  const game = lobby.game && typeof lobby.game === "object" ? { ...lobby.game } : {};
  game.phase = typeof game.phase === "string" ? game.phase : "setup";
  game.activeIndex = Number.isInteger(game.activeIndex) ? game.activeIndex : 0;
  game.currentQuestion = game.currentQuestion && typeof game.currentQuestion === "object" ? { ...game.currentQuestion } : null;
  game.review = game.review && typeof game.review === "object" ? { ...game.review } : null;
  game.players = Array.isArray(game.players) ? game.players.map((player) => ({ ...player })) : [];
  game.askedQuestionIds = Array.isArray(game.askedQuestionIds) ? [...game.askedQuestionIds] : [];
  game.forceThree = Boolean(game.forceThree);
  game.placements = Array.isArray(game.placements) ? game.placements.map((player) => ({ ...player })) : [];
  game.lastRace = Array.isArray(game.lastRace) ? game.lastRace.map((record) => ({ ...record })) : [];
  game.feedback = typeof game.feedback === "string" ? game.feedback : "Set up the race and start.";
  game.trackTemplateKey = typeof game.trackTemplateKey === "string" ? game.trackTemplateKey : (lobby.trackKey || "");
  return game;
}

function appendActivity(lobby, kind, text) {
  const entries = Array.isArray(lobby.activityLog) ? lobby.activityLog.slice(-39) : [];
  entries.push({
    at: Date.now(),
    kind: String(kind || "info").slice(0, 24),
    text: String(text || "").slice(0, 280),
  });
  lobby.activityLog = entries;
}

function currentPlayer(game) {
  return game.players[game.activeIndex];
}

function hazardAt(lobby, index) {
  return cloneHazards(lobby.hazards).find((hazard) => hazard.space === index)?.type || null;
}

function awardPoints(player, difficulty, move) {
  const score = DIFFICULTY_POINTS[difficulty] + Math.max(0, move - 1);
  player.score += score;
  player.correctAnswers += 1;
  return score;
}

function difficultyForMove(player, spaces, repair) {
  if (repair) return 0;
  return clamp((player.score > 18 ? 1 : 0) + (spaces - 1), 0, 4);
}

function randomWrongOptionId(question) {
  const wrongOptions = question.options.filter((option) => option.id !== question.answer);
  if (!wrongOptions.length) return question.answer;
  return wrongOptions[randInt(0, wrongOptions.length - 1)].id;
}

function chooseAiMove(lobby, game, player) {
  if (game.forceThree) return 3;
  if (player.brokenDown) return 1;
  let bestMove = 1;
  let bestScore = -Infinity;
  for (const move of MOVE_OPTIONS) {
    const target = Math.min(FINISH_INDEX, player.position + move);
    const hazard = hazardAt(lobby, target);
    let score = move * 4 + (move === 1 ? 2 : 0);
    if (hazard === "spinner") score += 10;
    if (hazard === "skipper") score += 12;
    if (hazard === "sinker") score += 8;
    if (hazard === "steps") score += 5;
    if (hazard === "oil") score += 3;
    if (hazard === "redflag") score -= 8;
    if (target >= FIRST_CROSSING_INDEX && !SAFE_SPOTS.has(target)) {
      score += game.players.filter((other) => other !== player && other.position === target && !other.brokenDown).length * 9;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

function generateQuestion(lobby, game, player, move, repair = false) {
  const difficulty = difficultyForMove(player, move, repair);
  const selectedModule = COURSE_MODULES[(Number(lobby.config?.mode) || 1) - 1] || COURSE_MODULES[0];
  const moduleQuestions = selectedModule.all
    ? RESCUE_QUESTIONS
    : RESCUE_QUESTIONS.filter((question) => question.moduleSlug === selectedModule.slug);
  const exactDifficulty = moduleQuestions.filter((question) => question.difficulty === difficulty + 1);
  const nearbyDifficulty = moduleQuestions.filter((question) => question.difficulty <= difficulty + 1);
  const fallbackQuestions = moduleQuestions.length ? moduleQuestions : RESCUE_QUESTIONS;
  let pool = exactDifficulty.length ? exactDifficulty : nearbyDifficulty.length ? nearbyDifficulty : fallbackQuestions;
  const askedIds = new Set(game.askedQuestionIds);
  const freshPool = pool.filter((question) => !askedIds.has(question.id));
  if (freshPool.length) {
    pool = freshPool;
  } else if (askedIds.size > 0) {
    askedIds.clear();
    game.askedQuestionIds = [];
  }
  const question = pool[randInt(0, pool.length - 1)];
  if (!question) throw new Error("Rescue question bank is empty or failed to load.");
  askedIds.add(question.id);
  game.askedQuestionIds = [...askedIds];
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
    moduleName: MODE_NAMES[Number(lobby.config?.mode) || 1] || MODE_NAMES[1],
    questionStyle: question.questionStyle,
    caseContext: question.caseContext,
    sourceRef: question.sourceRef,
    explanation: question.explanation,
    options,
  };
}

function finishRace(lobby, game, winner) {
  game.phase = "gameOver";
  game.placements = [...game.players].sort((a, b) => {
    if (b.position !== a.position) return b.position - a.position;
    return b.score - a.score;
  });
  game.placements.forEach((player, index) => {
    player.score += PLACEMENT_BONUS[index] || 0;
  });
  game.feedback = `${winner.name} wins the race.`;
  game.lastRace = game.placements.map((player, index) => ({
    initials: player.initials,
    score: player.score,
    place: index + 1,
    name: player.name,
    mode: Number(lobby.config?.mode) || 1,
    track: game.trackTemplateKey || lobby.trackKey || "",
  }));
  appendActivity(lobby, "finish", `${winner.name} won the race.`);
}

function applyMove(lobby, game, player, move, points) {
  player.position = Math.min(FINISH_INDEX, player.position + move);
  const target = player.position;
  const opponents = game.players.filter((other) => other !== player && other.position === target);
  if (target >= FIRST_CROSSING_INDEX && !SAFE_SPOTS.has(target)) {
    opponents.forEach((opponent) => {
      if (opponent.brokenDown) return;
      if (opponent.shielded) {
        opponent.shielded = false;
      } else {
        opponent.brokenDown = true;
      }
    });
  }
  const hazard = hazardAt(lobby, target);
  if (hazard === "spinner") {
    const jump = randInt(1, 4);
    player.position = Math.min(FINISH_INDEX, player.position + jump);
    game.feedback = `${player.name} hit Spinner and jumped ${jump} more spaces. +${points} points.`;
  } else if (hazard === "skipper") {
    player.skipNextSelection = true;
    game.feedback = `${player.name} hit Skipper and earns an extra turn. +${points} points.`;
  } else if (hazard === "sinker") {
    player.shielded = true;
    game.feedback = `${player.name} hit Sinker and gained one bump shield. +${points} points.`;
  } else if (hazard === "steps") {
    game.forceThree = true;
    game.feedback = `${player.name} reached Steps. Only 3-space moves remain. +${points} points.`;
  } else if (hazard === "oil") {
    const slide = Math.min(2, FINISH_INDEX - player.position);
    player.position = Math.min(FINISH_INDEX, player.position + slide);
    player.missNextTurn = true;
    game.feedback = `${player.name} hit an Oil Slick, slid ${slide} extra space${slide === 1 ? "" : "s"}, and will lose the next turn. +${points} points.`;
  } else if (hazard === "redflag") {
    player.missNextTurn = true;
    game.feedback = `${player.name} triggered a Red Flag and will lose the next turn. +${points} points.`;
  } else {
    game.feedback = `${player.name} advanced ${move} space${move === 1 ? "" : "s"}. +${points} points.`;
  }
  if (player.position >= FINISH_INDEX) {
    finishRace(lobby, game, player);
  }
}

function nextTurn(game) {
  const player = currentPlayer(game);
  if (player.skipNextSelection) {
    player.skipNextSelection = false;
    game.phase = "chooseMove";
  } else {
    let nextIndex = (game.activeIndex + 1) % game.players.length;
    while (game.players[nextIndex]?.missNextTurn) {
      game.players[nextIndex].missNextTurn = false;
      nextIndex = (nextIndex + 1) % game.players.length;
    }
    game.activeIndex = nextIndex;
    game.phase = "chooseMove";
  }
}

function askQuestionServer(lobby, game, move) {
  const player = currentPlayer(game);
  const repair = player.brokenDown;
  game.currentQuestion = {
    ...generateQuestion(lobby, game, player, move, repair),
    move,
    repair,
  };
  game.phase = "answering";
  game.review = null;
  game.feedback = repair
    ? `${player.name} needs a repair answer.`
    : `${player.name} is answering for ${move} space${move === 1 ? "" : "s"}.`;
  appendActivity(lobby, "question", `${player.name} question: ${game.currentQuestion.prompt}`);
}

function submitAnswerServer(lobby, game, rawValue) {
  const player = currentPlayer(game);
  const question = game.currentQuestion;
  if (!question) throw new Error("No active question.");
  const expected = question.answer;
  const selectedOption = question.options.find((option) => option.id === rawValue);
  const correct = rawValue === expected;
  const selectedText = selectedOption ? selectedOption.text : "No answer selected";
  let summary = "";
  let explanation = question.explanation || "";
  if (correct) {
    const points = awardPoints(player, question.difficulty, question.move);
    if (question.repair) {
      player.brokenDown = false;
      game.feedback = `${player.name} repaired the car. +${points} points.`;
    } else {
      applyMove(lobby, game, player, question.move, points);
    }
    summary = `${player.name} answered correctly.`;
    if (!explanation) explanation = `Correct answer: ${question.correctText}`;
  } else {
    const detail = selectedOption && selectedOption.explanation ? ` ${selectedOption.explanation}` : "";
    game.feedback = `Incorrect. Correct answer: ${question.correctText}.${detail}`;
    summary = `Correct answer: ${question.correctText}`;
    explanation = explanation || (selectedOption && selectedOption.explanation) || "";
  }
  game.currentQuestion = null;
  game.review = {
    correct,
    playerName: player.name,
    prompt: question.prompt,
    selectedText,
    correctText: question.correctText,
    summary,
    explanation,
  };
  appendActivity(lobby, "answer", `${player.name} answered: ${selectedText}`);
  appendActivity(lobby, correct ? "correct" : "wrong", `${player.name} was ${correct ? "correct" : "wrong"}. Correct answer: ${question.correctText}`);
}

function maybeResolveAiTurn(lobby, game) {
  while (game.phase !== "gameOver" && currentPlayer(game)?.isAi) {
    if (game.phase === "chooseMove") {
      askQuestionServer(lobby, game, chooseAiMove(lobby, game, currentPlayer(game)));
    }
    if (game.phase === "answering" && game.currentQuestion) {
      const difficulty = game.currentQuestion.difficulty;
      const accuracy = clamp(0.9 - difficulty * 0.12, 0.24, 0.97);
      const answer = Math.random() < accuracy
        ? game.currentQuestion.answer
        : randomWrongOptionId(game.currentQuestion);
      submitAnswerServer(lobby, game, String(answer));
      return;
    }
    return;
  }
}

function sanitizeConfig(config) {
  return {
    players: clamp(Number(config?.players || 2), 2, MAX_PLAYERS),
    humans: clamp(Number(config?.humans || 1), 1, MAX_PLAYERS),
    mode: clamp(Number(config?.mode || 1), 1, COURSE_MODULES.length),
    theme: String(config?.theme || "sand").slice(0, 24),
    track: String(config?.track || "classic").slice(0, 24),
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return body ? JSON.parse(body) : {};
}

function sanitizeLobby(code, lobby) {
  const cleanCode = String(code || lobby.code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  if (!cleanCode) throw new Error("Lobby code is required.");

  return {
    active: true,
    code: cleanCode,
    revision: Number(lobby.revision || 0),
    configVersion: Number(lobby.configVersion || 1),
    players: Array.isArray(lobby.players) ? lobby.players.slice(0, MAX_PLAYERS).map((player) => ({
      id: String(player.id || "").slice(0, 80),
      name: String(player.name || "Driver").slice(0, 18),
      readyVersion: Number(player.readyVersion || 0),
      host: Boolean(player.host),
    })) : [],
    updatedAt: Date.now(),
    config: lobby.config && typeof lobby.config === "object" ? lobby.config : undefined,
    trackKey: typeof lobby.trackKey === "string" ? lobby.trackKey : undefined,
    hazards: Array.isArray(lobby.hazards) ? lobby.hazards : undefined,
    game: lobby.game && typeof lobby.game === "object" ? lobby.game : undefined,
    activityLog: Array.isArray(lobby.activityLog)
      ? lobby.activityLog.slice(-40).map((entry) => ({
        at: Number(entry.at || Date.now()),
        kind: String(entry.kind || "info").slice(0, 24),
        text: String(entry.text || "").slice(0, 280),
      }))
      : undefined,
  };
}

function respondWithLobby(response, lobby) {
  lobbies.set(lobby.code, lobby);
  broadcastLobbies();
  sendJson(response, 200, { lobby, lobbies: registryObject() });
}

function requireHost(lobby, clientId) {
  const actor = lobby.players.find((player) => player.id === clientId);
  if (!actor || !actor.host) {
    throw new Error("Only the host can perform that action.");
  }
}

function ensureActorTurn(lobby, game, clientId) {
  const actorIndex = lobby.players.findIndex((player) => player.id === clientId);
  if (actorIndex < 0 || actorIndex !== game.activeIndex) {
    throw new Error("It is not this player's turn.");
  }
}

function handleLobbyAction(code, payload) {
  const action = String(payload?.type || "");
  const clientId = String(payload?.clientId || "").slice(0, 80);
  const playerName = String(payload?.playerName || "Driver").slice(0, 18);
  const existing = lobbies.get(code);

  if (action === "create") {
    if (existing) throw new Error(`Race ${code} already exists.`);
    const lobby = sanitizeLobby(code, {
      code,
      revision: 0,
      configVersion: 1,
      players: [{ id: clientId, name: playerName, readyVersion: 1, host: true }],
      config: sanitizeConfig(payload.config),
      trackKey: typeof payload.trackKey === "string" ? payload.trackKey : "",
      hazards: cloneHazards(payload.hazards),
      game: {
        phase: "setup",
        activeIndex: 0,
        currentQuestion: null,
        review: null,
        players: [],
        askedQuestionIds: [],
        forceThree: false,
        placements: [],
        lastRace: [],
        feedback: `${playerName} created race ${code}.`,
        trackTemplateKey: typeof payload.trackKey === "string" ? payload.trackKey : "",
      },
      activityLog: [{ at: Date.now(), kind: "race", text: `${playerName} created race ${code}.` }],
    });
    lobby.revision = 1;
    return lobby;
  }

  if (!existing) {
    throw new Error(`Race ${code} was not found.`);
  }

  const lobby = sanitizeLobby(code, existing);
  lobby.revision = Number(existing.revision || 0);
  lobby.config = sanitizeConfig(existing.config);
  lobby.trackKey = typeof existing.trackKey === "string" ? existing.trackKey : "";
  lobby.hazards = cloneHazards(existing.hazards);
  lobby.game = makeGameState(existing);
  lobby.activityLog = Array.isArray(existing.activityLog) ? existing.activityLog.slice(-40) : [];

  if (Number(payload?.revision || 0) !== Number(existing.revision || 0)) {
    throw new Error("This race changed on another device. Refresh and try again.");
  }

  if (action === "join") {
    const actor = lobby.players.find((player) => player.id === clientId);
    if (!actor && lobby.players.length >= MAX_PLAYERS) {
      throw new Error(`Race ${code} already has the maximum ${MAX_PLAYERS} racers.`);
    }
    if (actor) {
      actor.name = playerName;
    } else {
      lobby.players.push({
        id: clientId,
        name: playerName,
        readyVersion: lobby.configVersion,
        host: false,
      });
      appendActivity(lobby, "race", `${playerName} joined race ${code}.`);
    }
    lobby.config.players = Math.max(Number(lobby.config?.players || 2), lobby.players.length, 2);
    lobby.config.humans = clamp(Math.max(Number(lobby.config?.humans || 1), lobby.players.length), 1, lobby.config.players);
    if (lobby.game.phase === "lobby") {
      lobby.game.phase = "setup";
    }
  } else if (action === "configure") {
    requireHost(lobby, clientId);
    lobby.config = sanitizeConfig(payload.config);
    lobby.config.players = Math.max(lobby.players.length, lobby.config.players, 2);
    lobby.config.humans = clamp(Math.max(lobby.config.humans, lobby.players.length), 1, lobby.config.players);
    lobby.trackKey = typeof payload.trackKey === "string" ? payload.trackKey : lobby.trackKey;
    lobby.hazards = cloneHazards(payload.hazards);
    lobby.game.trackTemplateKey = lobby.trackKey;
    lobby.game.feedback = "Race setup updated.";
  } else if (action === "startRace") {
    requireHost(lobby, clientId);
    const drivers = Array.isArray(payload.drivers) ? payload.drivers.slice(0, MAX_PLAYERS) : [];
    const game = makeGameState(lobby);
    game.players = drivers.map((driver, index) => {
      const style = styleForIndex(index);
      const lobbyPlayer = lobby.players[index];
      const isAi = !lobbyPlayer && driver.controller === "ai";
      const initialsValue = String(driver.initials || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      return {
        ...style,
        name: lobbyPlayer && !isAi ? lobbyPlayer.name : style.name,
        initials: isAi ? "CPU" : (initialsValue || style.name.slice(0, 3).toUpperCase()),
        isAi,
        timed: Boolean(driver.timed),
        position: 0,
        score: 0,
        correctAnswers: 0,
        shielded: false,
        brokenDown: false,
        skipNextSelection: false,
        missNextTurn: false,
      };
    });
    game.activeIndex = 0;
    game.phase = "chooseMove";
    game.currentQuestion = null;
    game.review = null;
    game.askedQuestionIds = [];
    game.forceThree = false;
    game.placements = [];
    game.feedback = "Race started. Choose a move, then answer an EMT question.";
    game.trackTemplateKey = lobby.trackKey;
    lobby.game = game;
    appendActivity(lobby, "race", `Race started on ${lobby.trackKey || lobby.config.track}.`);
    maybeResolveAiTurn(lobby, lobby.game);
  } else if (action === "chooseMove") {
    const game = makeGameState(lobby);
    ensureActorTurn(lobby, game, clientId);
    if (game.phase !== "chooseMove") throw new Error("The race is not waiting for a move.");
    const move = clamp(Number(payload.move || 1), 1, 3);
    if (game.forceThree && move !== 3 && currentPlayer(game).position + move < FINISH_INDEX) {
      throw new Error("Only 3-space moves are allowed right now.");
    }
    askQuestionServer(lobby, game, move);
    lobby.game = game;
  } else if (action === "submitAnswer") {
    const game = makeGameState(lobby);
    ensureActorTurn(lobby, game, clientId);
    if (game.phase !== "answering") throw new Error("There is no active question to answer.");
    submitAnswerServer(lobby, game, String(payload.answerId || ""));
    lobby.game = game;
  } else if (action === "continue") {
    const game = makeGameState(lobby);
    if (!game.review) throw new Error("There is no review state to continue from.");
    game.review = null;
    if (game.phase !== "gameOver") {
      nextTurn(game);
      maybeResolveAiTurn(lobby, game);
    }
    lobby.game = game;
  } else if (action === "reset") {
    requireHost(lobby, clientId);
    lobby.game = {
      phase: "setup",
      activeIndex: 0,
      currentQuestion: null,
      review: null,
      players: [],
      askedQuestionIds: [],
      forceThree: false,
      placements: [],
      lastRace: [],
      feedback: "Set up the next race.",
      trackTemplateKey: lobby.trackKey,
    };
    appendActivity(lobby, "race", "Race reset to setup.");
  } else if (action === "close") {
    requireHost(lobby, clientId);
    lobbies.delete(code);
    return null;
  } else {
    throw new Error("Unknown action.");
  }

  lobby.updatedAt = Date.now();
  lobby.revision += 1;
  return sanitizeLobby(code, {
    ...lobby,
    revision: lobby.revision,
    updatedAt: lobby.updatedAt,
    config: lobby.config,
    trackKey: lobby.trackKey,
    hazards: lobby.hazards,
    game: lobby.game,
    activityLog: lobby.activityLog,
  });
}

function styleForIndex(index) {
  if (PLAYER_STYLES[index]) return PLAYER_STYLES[index];
  const hue = (index * 47) % 360;
  return {
    name: `Car ${index + 1}`,
    color: `hsl(${hue} 62% 52%)`,
  };
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return true;
  }

  if (url.pathname === "/api/lobbies" && request.method === "GET") {
    sendJson(response, 200, { lobbies: registryObject() });
    return true;
  }

  if (url.pathname === "/api/stream" && request.method === "GET") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    response.write(`data: ${JSON.stringify({ lobbies: registryObject() })}\n\n`);
    streamClients.add(response);
    request.on("close", () => {
      streamClients.delete(response);
    });
    return true;
  }

  const match = url.pathname.match(/^\/api\/lobbies\/([A-Za-z0-9]{1,8})$/);
  const actionMatch = url.pathname.match(/^\/api\/lobbies\/([A-Za-z0-9]{1,8})\/action$/);
  if (actionMatch && request.method === "POST") {
    try {
      const code = actionMatch[1].toUpperCase();
      const lobby = handleLobbyAction(code, await readRequestJson(request));
      if (!lobby) {
        broadcastLobbies();
        sendJson(response, 200, { lobby: null, lobbies: registryObject() });
        return true;
      }
      respondWithLobby(response, lobby);
    } catch (error) {
      sendJson(response, error.status || 400, {
        error: error.message || "Invalid action payload.",
        errorCode: error.errorCode,
        allowOverride: Boolean(error.allowOverride),
        maxRacers: error.maxRacers,
        absoluteMax: error.absoluteMax,
        lobbies: registryObject(),
      });
    }
    return true;
  }
  if (!match) return false;

  const code = match[1].toUpperCase();
  if (request.method === "GET") {
    pruneLobbies();
    sendJson(response, 200, { lobby: lobbies.get(code) || null, lobbies: registryObject() });
    return true;
  }

  if (request.method === "PUT") {
    try {
      const lobby = sanitizeLobby(code, await readRequestJson(request));
      const existing = lobbies.get(code);
      if (existing && Number(lobby.revision || 0) !== Number(existing.revision || 0)) {
        sendJson(response, 409, { error: "Lobby revision conflict.", lobby: existing, lobbies: registryObject() });
        return true;
      }
      lobby.revision = Number(existing?.revision || 0) + 1;
      lobbies.set(lobby.code, lobby);
      sendJson(response, 200, { lobby, lobbies: registryObject() });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Invalid lobby payload." });
    }
    return true;
  }

  if (request.method === "DELETE") {
    lobbies.delete(code);
    broadcastLobbies();
    sendJson(response, 200, { lobbies: registryObject() });
    return true;
  }

  sendJson(response, 405, { error: "Method not allowed." });
  return true;
}

async function serveStatic(response, pathname) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(root, `.${normalize(decodeURIComponent(requestPath))}`);
  if (!filePath.startsWith(resolve(root))) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=60",
    });
    response.end(content);
  } catch {
    const fallback = await readFile(join(root, "index.html"));
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fallback);
  }
}

function createAppServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (await handleApi(request, response, url)) return;
    await serveStatic(response, url.pathname);
  });
}

function listenOnAvailablePort(startPort) {
  let attempts = 0;

  function tryPort(portToTry) {
    const server = createAppServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" && attempts < maxPortAttempts - 1) {
        attempts += 1;
        const nextPort = portToTry + 1;
        console.warn(`Port ${portToTry} is already in use. Trying ${nextPort}...`);
        tryPort(nextPort);
        return;
      }

      if (error.code === "EADDRINUSE") {
        console.error(`No available port found from ${startPort} through ${portToTry}. Set PORT to a free port and restart.`);
      } else {
        console.error(error);
      }
      process.exit(1);
    });

    server.listen(portToTry, host, () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : portToTry;
      const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
      console.log(`Rescue Gran Prix server listening on http://${displayHost}:${actualPort}`);
      if (host === "0.0.0.0") {
        console.log(`LAN devices can connect with http://THIS_MACHINE_LAN_IP:${actualPort}`);
      }
    });
  }

  tryPort(startPort);
}

listenOnAvailablePort(preferredPort);
