/*
 * Punting Form analytics demo — fictional sample data.
 * Shapes follow the Punting Form V2 feed: meetings, races, runners,
 * 200m sequential sectionals, plus a seeded past-start history table.
 */
(function () {
  "use strict";

  const CONFIG = {
    date: "2026-11-07",
    states: { WA: true, VIC: false, NSW: false, QLD: false, SA: false, TAS: false, NT: false },
  };

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const MEETINGS = [
    {
      id: 1,
      date: "2026-11-07",
      track: "Ascot",
      state: "WA",
      rail: "True",
      condition: "Good 4",
      weather: "Fine, 24°C",
      firstRace: "12:15",
    },
    {
      id: 2,
      date: "2026-11-07",
      track: "Flemington",
      state: "VIC",
      rail: "Out 4m",
      condition: "Good 3",
      weather: "Overcast, 19°C",
      firstRace: "12:40",
    },
  ];

  const RACES = [
    { id: 1, meetingId: 1, no: 1, time: "12:15", dist: 1000, cls: "Maiden", prize: "$25,000", going: "Good 4" },
    { id: 2, meetingId: 1, no: 2, time: "12:50", dist: 1200, cls: "BM64", prize: "$30,000", going: "Good 4" },
    { id: 3, meetingId: 1, no: 3, time: "13:25", dist: 1400, cls: "BM72", prize: "$35,000", going: "Good 4" },
    { id: 4, meetingId: 1, no: 4, time: "14:00", dist: 1600, cls: "Listed", prize: "$100,000", going: "Good 4" },
    { id: 5, meetingId: 2, no: 1, time: "12:40", dist: 1400, cls: "BM70", prize: "$50,000", going: "Good 3" },
  ];

  /*
   * shape / strength drive the last-start sectional curve:
   *   close -> fast late, fade -> slow late, even -> even.
   * fml600 and fml200 are computed from the generated splits.
   */
  const RUNNER_SEED = [
    // Race 1 — 1000m Maiden
    { raceId: 1, no: 1, horse: "Red Gum Ridge", barrier: 2, jockey: "T. Harlow", trainer: "G. Pritchard", weight: 57, clsDiff: 0, kri: 52, runStyle: "Leader", prSe: 1, days: 18, up: 3, lastDist: 1000, lastTrack: "Belmont", shape: "even", strength: 0 },
    { raceId: 1, no: 2, horse: "Broome Pearl", barrier: 5, jockey: "C. Ng", trainer: "S. Mallory", weight: 55.5, clsDiff: -0.6, kri: 61, runStyle: "On-pace", prSe: 3, days: 24, up: 3, lastDist: 1200, lastTrack: "Pinjarra", shape: "fade", strength: 0.7 },
    { raceId: 1, no: 3, horse: "Fremantle Flyer", barrier: 1, jockey: "J. Whitfield", trainer: "D. Nguyen", weight: 57, clsDiff: -1.2, kri: 66, runStyle: "Leader", prSe: 2, days: 12, up: 3, lastDist: 1000, lastTrack: "Ascot", shape: "close", strength: 0.55 },
    { raceId: 1, no: 4, horse: "Cottesloe Surf", barrier: 7, jockey: "B. Alderson", trainer: "K. Whitmore", weight: 57, clsDiff: 0, kri: 44, runStyle: "Midfield", prSe: 6, days: 31, up: 3, lastDist: 1200, lastTrack: "Northam", shape: "even", strength: 0 },
    { raceId: 1, no: 5, horse: "Kimberley Gold", barrier: 4, jockey: "P. Devlin", trainer: "R. Castellano", weight: 57, clsDiff: -0.4, kri: 58, runStyle: "On-pace", prSe: 4, days: 9, up: 3, lastDist: 1000, lastTrack: "Broome", shape: "even", strength: 0 },
    { raceId: 1, no: 6, horse: "Busselton Breeze", barrier: 8, jockey: "H. Marsh", trainer: "R. Castellano", weight: 55.5, clsDiff: 0, kri: 49, runStyle: "Backmarker", prSe: 9, days: 45, up: 1, lastDist: 1200, lastTrack: "Bunbury", shape: "close", strength: 0.9 },
    { raceId: 1, no: 7, horse: "Albany Anchor", barrier: 6, jockey: "A. Kovacs", trainer: "L. Tanaka", weight: 57, clsDiff: 0, kri: 39, runStyle: "Midfield", prSe: 7, days: 21, up: 3, lastDist: 1000, lastTrack: "Albany", shape: "fade", strength: 0.6 },
    { raceId: 1, no: 8, horse: "York Imperial", barrier: 3, jockey: "W. Frame", trainer: "M. O'Sullivan", weight: 57, clsDiff: -0.3, kri: 63, runStyle: "On-pace", prSe: 3, days: 15, up: 2, lastDist: 1200, lastTrack: "York", shape: "fade", strength: 0.8 },
    { raceId: 1, no: 9, horse: "Narrogin Native", barrier: 9, jockey: "T. Harlow", trainer: "G. Pritchard", weight: 57, clsDiff: 0, kri: 47, runStyle: "Backmarker", prSe: 10, days: 60, up: 1, lastDist: 1400, lastTrack: "Narrogin", shape: "close", strength: 0.6 },

    // Race 2 — 1200m BM64 (one leader: projected slow)
    { raceId: 2, no: 1, horse: "Kalgoorlie Kid", barrier: 4, jockey: "J. Whitfield", trainer: "S. Mallory", weight: 59, clsDiff: -2.5, kri: 71, runStyle: "Midfield", prSe: 6, days: 7, up: 3, lastDist: 1200, lastTrack: "Ascot", shape: "close", strength: 0.95 },
    { raceId: 2, no: 2, horse: "Scarlett Storm", barrier: 8, jockey: "C. Ng", trainer: "D. Nguyen", weight: 57.5, clsDiff: 0, kri: 55, runStyle: "Backmarker", prSe: 9, days: 21, up: 2, lastDist: 1400, lastTrack: "Pinjarra", shape: "close", strength: 0.6 },
    { raceId: 2, no: 3, horse: "Northern Beau", barrier: 2, jockey: "H. Marsh", trainer: "G. Pritchard", weight: 58, clsDiff: -1.8, kri: 68, runStyle: "On-pace", prSe: 3, days: 14, up: 3, lastDist: 1200, lastTrack: "Ascot", shape: "even", strength: 0 },
    { raceId: 2, no: 4, horse: "Mandurah Magic", barrier: 6, jockey: "B. Alderson", trainer: "K. Whitmore", weight: 56.5, clsDiff: 0, kri: 42, runStyle: "Midfield", prSe: 7, days: 28, up: 3, lastDist: 1200, lastTrack: "Bunbury", shape: "fade", strength: 0.7 },
    { raceId: 2, no: 5, horse: "Avon Descent", barrier: 1, jockey: "T. Harlow", trainer: "R. Castellano", weight: 59.5, clsDiff: 0, kri: 64, runStyle: "Leader", prSe: 2, days: 84, up: 1, lastDist: 1200, lastTrack: "Northam", shape: "even", strength: 0 },
    { raceId: 2, no: 6, horse: "Rottnest Rocket", barrier: 3, jockey: "P. Devlin", trainer: "J. Abercrombie", weight: 55, clsDiff: 0, kri: 51, runStyle: "On-pace", prSe: 4, days: 6, up: 3, lastDist: 1000, lastTrack: "Ascot", shape: "fade", strength: 0.8 },
    { raceId: 2, no: 7, horse: "Blackwood Bay", barrier: 10, jockey: "A. Kovacs", trainer: "L. Tanaka", weight: 54.5, clsDiff: -0.6, kri: 68, runStyle: "Backmarker", prSe: 10, days: 90, up: 1, lastDist: 1400, lastTrack: "Bunbury", shape: "close", strength: 0.85 },
    { raceId: 2, no: 8, horse: "Margaret's Reign", barrier: 5, jockey: "W. Frame", trainer: "M. O'Sullivan", weight: 55.5, clsDiff: 0, kri: 48, runStyle: "Midfield", prSe: 5, days: 19, up: 2, lastDist: 1200, lastTrack: "York", shape: "even", strength: 0 },
    { raceId: 2, no: 9, horse: "Darling Range", barrier: 7, jockey: "J. Whitfield", trainer: "S. Mallory", weight: 58.5, clsDiff: 0, kri: 37, runStyle: "Backmarker", prSe: 11, days: 56, up: 1, lastDist: 1600, lastTrack: "Belmont", shape: "even", strength: 0 },
    { raceId: 2, no: 10, horse: "Geraldton Ghost", barrier: 9, jockey: "C. Ng", trainer: "D. Nguyen", weight: 54, clsDiff: -0.9, kri: 59, runStyle: "Midfield", prSe: 8, days: 11, up: 3, lastDist: 1200, lastTrack: "Geraldton", shape: "fade", strength: 0.5 },

    // Race 3 — 1400m BM72 (three leaders: projected fast)
    { raceId: 3, no: 1, horse: "Swan River Belle", barrier: 3, jockey: "T. Harlow", trainer: "G. Pritchard", weight: 57.5, clsDiff: -2.5, kri: 78, runStyle: "Midfield", prSe: 6, days: 6, up: 3, lastDist: 1400, lastTrack: "Ascot", shape: "close", strength: 0.9 },
    { raceId: 3, no: 2, horse: "Pilbara Prospector", barrier: 1, jockey: "J. Whitfield", trainer: "S. Mallory", weight: 59, clsDiff: 0, kri: 66, runStyle: "Leader", prSe: 1, days: 20, up: 3, lastDist: 1400, lastTrack: "Broome", shape: "fade", strength: 0.9 },
    { raceId: 3, no: 3, horse: "Esperance Star", barrier: 6, jockey: "H. Marsh", trainer: "D. Nguyen", weight: 55, clsDiff: 0, kri: 45, runStyle: "Midfield", prSe: 7, days: 17, up: 2, lastDist: 1600, lastTrack: "Esperance", shape: "even", strength: 0 },
    { raceId: 3, no: 4, horse: "Halls Creek Hero", barrier: 2, jockey: "B. Alderson", trainer: "K. Whitmore", weight: 58, clsDiff: -4.1, kri: 83, runStyle: "On-pace", prSe: 3, days: 13, up: 3, lastDist: 1200, lastTrack: "Ascot", shape: "close", strength: 0.8 },
    { raceId: 3, no: 5, horse: "Marble Bar Miss", barrier: 8, jockey: "P. Devlin", trainer: "R. Castellano", weight: 54.5, clsDiff: 0, kri: 57, runStyle: "Leader", prSe: 2, days: 74, up: 1, lastDist: 1400, lastTrack: "Geraldton", shape: "even", strength: 0 },
    { raceId: 3, no: 6, horse: "Derby Dreamer", barrier: 5, jockey: "A. Kovacs", trainer: "J. Abercrombie", weight: 56, clsDiff: -0.8, kri: 69, runStyle: "Backmarker", prSe: 9, days: 8, up: 3, lastDist: 1600, lastTrack: "Belmont", shape: "close", strength: 0.55 },
    { raceId: 3, no: 7, horse: "Fitzroy Flyer", barrier: 4, jockey: "W. Frame", trainer: "L. Tanaka", weight: 57, clsDiff: 0, kri: 62, runStyle: "Leader", prSe: 2, days: 25, up: 3, lastDist: 1400, lastTrack: "Derby", shape: "even", strength: 0 },
    { raceId: 3, no: 8, horse: "Karratha King", barrier: 10, jockey: "C. Ng", trainer: "M. O'Sullivan", weight: 55.5, clsDiff: 0, kri: 41, runStyle: "Midfield", prSe: 8, days: 26, up: 2, lastDist: 1200, lastTrack: "Karratha", shape: "fade", strength: 0.7 },
    { raceId: 3, no: 9, horse: "Gascoyne Gun", barrier: 7, jockey: "T. Harlow", trainer: "G. Pritchard", weight: 56.5, clsDiff: 0, kri: 73, runStyle: "On-pace", prSe: 3, days: 18, up: 2, lastDist: 1400, lastTrack: "Carnarvon", shape: "close", strength: 0.5 },
    { raceId: 3, no: 10, horse: "Irwin Idol", barrier: 9, jockey: "J. Whitfield", trainer: "S. Mallory", weight: 53.5, clsDiff: -0.5, kri: 50, runStyle: "Backmarker", prSe: 10, days: 71, up: 1, lastDist: 1600, lastTrack: "Ascot", shape: "even", strength: 0 },

    // Race 4 — 1600m Listed
    { raceId: 4, no: 1, horse: "Southern Cross", barrier: 5, jockey: "B. Alderson", trainer: "G. Pritchard", weight: 58, clsDiff: -3.4, kri: 86, runStyle: "Backmarker", prSe: 9, days: 63, up: 1, lastDist: 1600, lastTrack: "Ascot", shape: "close", strength: 1 },
    { raceId: 4, no: 2, horse: "Tom Price Tiger", barrier: 1, jockey: "J. Whitfield", trainer: "S. Mallory", weight: 57, clsDiff: 0, kri: 67, runStyle: "Leader", prSe: 1, days: 14, up: 3, lastDist: 1600, lastTrack: "Belmont", shape: "even", strength: 0 },
    { raceId: 4, no: 3, horse: "Wagin Warrior", barrier: 3, jockey: "C. Ng", trainer: "D. Nguyen", weight: 55, clsDiff: 0, kri: 53, runStyle: "On-pace", prSe: 3, days: 21, up: 2, lastDist: 1600, lastTrack: "Bunbury", shape: "fade", strength: 0.75 },
    { raceId: 4, no: 4, horse: "Rockingham Rebel", barrier: 7, jockey: "H. Marsh", trainer: "K. Whitmore", weight: 56.5, clsDiff: -0.8, kri: 69, runStyle: "Midfield", prSe: 5, days: 9, up: 3, lastDist: 1600, lastTrack: "Ascot", shape: "close", strength: 0.42 },
    { raceId: 4, no: 5, horse: "Port Hedland Prince", barrier: 2, jockey: "B. Alderson", trainer: "R. Castellano", weight: 54, clsDiff: 0, kri: 48, runStyle: "Leader", prSe: 2, days: 95, up: 1, lastDist: 1400, lastTrack: "Port Hedland", shape: "even", strength: 0 },
    { raceId: 4, no: 6, horse: "Quairading Queen", barrier: 8, jockey: "P. Devlin", trainer: "J. Abercrombie", weight: 53, clsDiff: 0, kri: 59, runStyle: "Backmarker", prSe: 10, days: 18, up: 2, lastDist: 1600, lastTrack: "Northam", shape: "close", strength: 0.5 },
    { raceId: 4, no: 7, horse: "Vasse Valley", barrier: 4, jockey: "A. Kovacs", trainer: "L. Tanaka", weight: 55.5, clsDiff: 0, kri: 44, runStyle: "Midfield", prSe: 6, days: 30, up: 3, lastDist: 1600, lastTrack: "Busselton", shape: "fade", strength: 0.6 },
    { raceId: 4, no: 8, horse: "Onslow Oracle", barrier: 6, jockey: "W. Frame", trainer: "M. O'Sullivan", weight: 56, clsDiff: 0, kri: 65, runStyle: "On-pace", prSe: 4, days: 77, up: 1, lastDist: 1600, lastTrack: "Ascot", shape: "even", strength: 0 },
    { raceId: 4, no: 9, horse: "Leederville Lad", barrier: 9, jockey: "C. Ng", trainer: "D. Nguyen", weight: 54.5, clsDiff: -0.2, kri: 46, runStyle: "Backmarker", prSe: 11, days: 12, up: 3, lastDist: 1600, lastTrack: "Belmont", shape: "fade", strength: 0.55 },

    // Race 5 — Flemington (excluded by the WA filter)
    { raceId: 5, no: 1, horse: "Moonee Valley Miss", barrier: 3, jockey: "D. Farrell", trainer: "P. Lang", weight: 57, clsDiff: -2.2, kri: 80, runStyle: "Leader", prSe: 2, days: 12, up: 3, lastDist: 1400, lastTrack: "Flemington", shape: "close", strength: 0.8 },
    { raceId: 5, no: 2, horse: "Yarra Bend", barrier: 6, jockey: "S. Petrie", trainer: "H. Wu", weight: 56, clsDiff: 0, kri: 64, runStyle: "Midfield", prSe: 6, days: 20, up: 2, lastDist: 1400, lastTrack: "Caulfield", shape: "even", strength: 0 },
    { raceId: 5, no: 3, horse: "Ballarat Beau", barrier: 1, jockey: "M. Doyle", trainer: "P. Lang", weight: 58, clsDiff: -1.1, kri: 72, runStyle: "On-pace", prSe: 3, days: 7, up: 3, lastDist: 1600, lastTrack: "Ballarat", shape: "close", strength: 0.7 },
    { raceId: 5, no: 4, horse: "Geelong Gold", barrier: 4, jockey: "D. Farrell", trainer: "H. Wu", weight: 55, clsDiff: 0, kri: 51, runStyle: "Backmarker", prSe: 10, days: 35, up: 1, lastDist: 1200, lastTrack: "Geelong", shape: "even", strength: 0 },
    { raceId: 5, no: 5, horse: "Mornington Star", barrier: 2, jockey: "S. Petrie", trainer: "P. Lang", weight: 54, clsDiff: 0, kri: 45, runStyle: "Leader", prSe: 1, days: 18, up: 2, lastDist: 1400, lastTrack: "Mornington", shape: "fade", strength: 0.6 },
    { raceId: 5, no: 6, horse: "Bendigo Breeze", barrier: 5, jockey: "M. Doyle", trainer: "H. Wu", weight: 56, clsDiff: 0, kri: 58, runStyle: "Midfield", prSe: 5, days: 40, up: 1, lastDist: 1400, lastTrack: "Bendigo", shape: "close", strength: 0.6 },
  ];

  const rand = mulberry32(7);

  function round(n, places) {
    const f = Math.pow(10, places);
    return Math.round(n * f) / f;
  }

  function addDays(iso, delta) {
    const parts = iso.split("-").map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
  }

  const RUNNERS = [];
  const SECTIONALS = {};

  RUNNER_SEED.forEach(function (seed, index) {
    const id = seed.raceId * 100 + seed.no;
    const segCount = seed.lastDist / 200;
    const segments = [];

    for (let i = 0; i < segCount; i++) {
      const t = (i + 1) / segCount;
      let offset;
      if (seed.shape === "close") {
        offset = 0.05 - seed.strength * 0.36 * t;
      } else if (seed.shape === "fade") {
        offset = 0.02 + seed.strength * 0.34 * t;
      } else {
        offset = -0.01 + 0.035 * Math.sin(t * Math.PI);
      }
      offset += (rand() - 0.5) * 0.07;
      offset = Math.max(-0.36, Math.min(0.36, offset));

      const benchmark = round(11.82 + 0.045 * i + (rand() - 0.5) * 0.05, 2);
      const split = round(benchmark + offset, 2);
      const from = seed.lastDist - i * 200;
      const to = from - 200;
      segments.push({
        idx: i,
        distFrom: from,
        distTo: to,
        split: split,
        benchmark: benchmark,
        varL: round((benchmark - split) * 6, 1),
      });
    }

    const lastThree = segments.slice(-3);
    const fml600 = round(lastThree.reduce(function (sum, s) { return sum + s.varL; }, 0), 1);
    const fml200 = round(segments[segments.length - 1].varL, 1);

    const runner = {
      id: id,
      raceId: seed.raceId,
      no: seed.no,
      horse: seed.horse,
      barrier: seed.barrier,
      jockey: seed.jockey,
      trainer: seed.trainer,
      weight: seed.weight,
      clsDiff: seed.clsDiff,
      kri: seed.kri,
      fml600: fml600,
      fml200: fml200,
      runStyle: seed.runStyle,
      prSe: seed.prSe,
      daysSinceLast: seed.days,
      upNumber: seed.up,
      lastStart: {
        dist: seed.lastDist,
        track: seed.lastTrack,
        date: addDays(CONFIG.date, -seed.days),
        cls: seed.raceId === 4 ? "BM66" : "BM58",
      },
    };

    runner.angle = runner.upNumber === 1 ? "firstUp" : runner.upNumber === 2 ? "secondUp" : runner.daysSinceLast <= 7 ? "backUp" : null;

    RUNNERS.push(runner);
    SECTIONALS[id] = segments;
  });

  /* ---------- Past-start history (seeded, stable across reloads) ---------- */

  const TRAINERS = ["G. Pritchard", "S. Mallory", "D. Nguyen", "K. Whitmore", "R. Castellano", "J. Abercrombie", "L. Tanaka", "M. O'Sullivan"];
  const JOCKEYS = ["T. Harlow", "J. Whitfield", "C. Ng", "B. Alderson", "P. Devlin", "H. Marsh", "A. Kovacs", "W. Frame"];
  const TRAINER_SKILL = [0.24, 0.19, 0.16, 0.13, 0.1, 0.09, 0.07, 0.06];
  const JOCKEY_SKILL = [0.22, 0.18, 0.15, 0.13, 0.12, 0.09, 0.08, 0.07];

  function buildHistory() {
    const rnd = mulberry32(42);
    const rows = [];
    for (let i = 0; i < 152; i++) {
      const tIdx = i % TRAINERS.length;
      const jIdx = Math.floor(rnd() * JOCKEYS.length);
      const upNumber = 1 + Math.floor(rnd() * 3);
      const daysSinceLast = upNumber === 1 ? 45 + Math.floor(rnd() * 140) : upNumber === 2 ? 14 + Math.floor(rnd() * 35) : 6 + Math.floor(rnd() * 28);
      const angleBoost = upNumber === 1 ? 0.02 : upNumber === 2 ? 0.01 : daysSinceLast <= 7 ? 0.015 : -0.005;
      const winProb = Math.max(0.03, Math.min(0.4, TRAINER_SKILL[tIdx] * 0.6 + JOCKEY_SKILL[jIdx] * 0.6 + angleBoost));
      const won = rnd() < winProb;
      const sp = won ? round(1.5 + rnd() * 4.5, 1) : round(2.4 + rnd() * 12, 1);
      rows.push({
        id: i + 1,
        trainer: TRAINERS[tIdx],
        jockey: JOCKEYS[jIdx],
        upNumber: upNumber,
        daysSinceLast: daysSinceLast,
        won: won,
        sp: sp,
      });
    }
    return rows;
  }

  window.DATA = {
    config: CONFIG,
    meetings: MEETINGS,
    races: RACES,
    runners: RUNNERS,
    sectionals: SECTIONALS,
    history: buildHistory(),
    trainers: TRAINERS,
    jockeys: JOCKEYS,
    stateNames: { WA: "Western Australia", VIC: "Victoria", NSW: "New South Wales", QLD: "Queensland", SA: "South Australia", TAS: "Tasmania", NT: "Northern Territory" },
  };
})();
