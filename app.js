/* Punting Form shortlist demo — browser-side "API" over data.js */
(function () {
  "use strict";

  const D = window.DATA;
  const CFG = D.config;
  const TABS = ["shortlists", "speedmaps", "angles", "hood"];
  const ANGLE_KEYS = ["firstUp", "secondUp", "backUp"];
  const ANGLE_LABELS = { firstUp: "1st-up", secondUp: "2nd-up", backUp: "Back-up ≤7d" };
  const ANGLE_SHORT = { firstUp: "1st-up", secondUp: "2nd-up", backUp: "≤7d" };

  const state = {
    tab: "shortlists",
    meetingId: 1,
    maxClsDiff: -1.0,
    minKri: 70,
    minL600: 2.0,
    minL200: 1.0,
    angleKind: "trainer",
    minStarts: 3,
  };

  /* ---------------- helpers ---------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function round(n, places) {
    const f = Math.pow(10, places);
    return Math.round(n * f) / f;
  }

  function signed(n, places) {
    const v = round(n, places == null ? 1 : places);
    return (v > 0 ? "+" : "") + v.toFixed(places == null ? 1 : places);
  }

  function pct(n) {
    return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  }

  function fmtDate(iso) {
    const parts = iso.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function currentMeeting() {
    return D.meetings.find(function (m) { return m.id === state.meetingId; }) || D.meetings[0];
  }

  function currentRaces() {
    return D.races.filter(function (r) { return r.meetingId === state.meetingId; })
      .sort(function (a, b) { return a.no - b.no; });
  }

  function raceById(id) {
    return D.races.find(function (r) { return r.id === id; });
  }

  function runnerById(id) {
    return D.runners.find(function (r) { return r.id === id; });
  }

  function meetingRunners() {
    const ids = new Set(currentRaces().map(function (r) { return r.id; }));
    return D.runners.filter(function (r) { return ids.has(r.raceId); });
  }

  function runnerRace(runner) {
    return raceById(runner.raceId);
  }

  function filterByState(meetings) {
    return meetings.filter(function (m) { return CFG.states[m.state] === true; });
  }

  /* ---------------- query functions (mirror the planned API) ---------------- */

  function classDroppers(maxClsDiff) {
    return meetingRunners()
      .filter(function (r) { return r.clsDiff <= maxClsDiff; })
      .sort(function (a, b) {
        return runnerRace(a).no - runnerRace(b).no || a.clsDiff - b.clsDiff;
      });
  }

  function hotForm(minKri) {
    return meetingRunners()
      .filter(function (r) { return r.kri >= minKri; })
      .sort(function (a, b) {
        return runnerRace(a).no - runnerRace(b).no || b.kri - a.kri;
      });
  }

  function closers(min600, min200) {
    return meetingRunners()
      .filter(function (r) { return r.fml600 >= min600 && r.fml200 >= min200; })
      .sort(function (a, b) {
        return runnerRace(a).no - runnerRace(b).no || b.fml600 - a.fml600;
      });
  }

  function speedMap(raceId) {
    const runners = D.runners.filter(function (r) { return r.raceId === raceId; });
    const lanes = [
      { key: "leader", label: "Leader", range: "PrSe 1–2", runners: [] },
      { key: "onpace", label: "On-pace", range: "PrSe 3–4", runners: [] },
      { key: "midfield", label: "Midfield", range: "PrSe 5–8", runners: [] },
      { key: "back", label: "Back", range: "PrSe 9+", runners: [] },
    ];
    runners.forEach(function (r) {
      if (r.prSe <= 2) lanes[0].runners.push(r);
      else if (r.prSe <= 4) lanes[1].runners.push(r);
      else if (r.prSe <= 8) lanes[2].runners.push(r);
      else lanes[3].runners.push(r);
    });
    lanes.forEach(function (lane) {
      lane.runners.sort(function (a, b) { return a.prSe - b.prSe || a.no - b.no; });
    });
    const leaders = runners.filter(function (r) { return r.runStyle === "Leader" && r.prSe <= 2; });
    const pace = leaders.length >= 3 ? "Fast" : leaders.length === 2 ? "Genuine" : "Slow";
    return { race: raceById(raceId), lanes: lanes, leaders: leaders, pace: pace };
  }

  function blankAngle() {
    return { starts: 0, wins: 0, returns: 0, sr: 0, roi: 0 };
  }

  function angles(kind) {
    const nameOf = kind === "jockey"
      ? function (row) { return row.jockey; }
      : function (row) { return row.trainer; };

    const map = new Map();
    D.history.forEach(function (row) {
      const name = nameOf(row);
      if (!map.has(name)) {
        const anglesInit = {};
        ANGLE_KEYS.forEach(function (k) { anglesInit[k] = blankAngle(); });
        map.set(name, { name: name, starts: 0, angles: anglesInit });
      }
      const record = map.get(name);
      record.starts += 1;

      const keys = [];
      if (row.upNumber === 1) keys.push("firstUp");
      if (row.upNumber === 2) keys.push("secondUp");
      if (row.daysSinceLast <= 7) keys.push("backUp");
      keys.forEach(function (key) {
        const a = record.angles[key];
        a.starts += 1;
        if (row.won) {
          a.wins += 1;
          a.returns += row.sp;
        }
      });
    });

    return Array.from(map.values()).map(function (record) {
      ANGLE_KEYS.forEach(function (key) {
        const a = record.angles[key];
        a.sr = a.starts ? (a.wins / a.starts) * 100 : 0;
        a.roi = a.starts ? ((a.returns - a.starts) / a.starts) * 100 : 0;
      });
      return record;
    }).sort(function (a, b) {
      return b.starts - a.starts || a.name.localeCompare(b.name);
    });
  }

  function sectionals(runnerId) {
    return D.sectionals[runnerId] || [];
  }

  function eligibleAngleKeys(runner) {
    const keys = [];
    if (runner.upNumber === 1) keys.push("firstUp");
    if (runner.upNumber === 2) keys.push("secondUp");
    if (runner.daysSinceLast <= 7) keys.push("backUp");
    return keys;
  }

  function findAngleBadge(runner) {
    const keys = eligibleAngleKeys(runner);
    if (!keys.length) return null;
    let best = null;

    [["trainer", runner.trainer, "T"], ["jockey", runner.jockey, "J"]].forEach(function (source) {
      const record = angles(source[0]).find(function (row) { return row.name === source[1]; });
      if (!record) return;
      keys.forEach(function (key) {
        const a = record.angles[key];
        if (a.starts >= state.minStarts && a.roi > 0) {
          if (!best || a.roi > best.roi) {
            best = { key: key, roi: a.roi, starts: a.starts, wins: a.wins, name: record.name, kind: source[2] };
          }
        }
      });
    });
    return best;
  }

  /* ---------------- shared markup ---------------- */

  function angleBadgeHTML(runner) {
    const badge = findAngleBadge(runner);
    if (!badge) return "";
    const label = badge.kind + " " + ANGLE_SHORT[badge.key] + " " + pct(badge.roi);
    const title = badge.name + " · " + ANGLE_LABELS[badge.key] + ": " + badge.starts + " starts, " + badge.wins + " wins, " + pct(badge.roi) + " ROI";
    return '<span class="angle-flag" title="' + esc(title) + '">' + esc(label) + "</span>";
  }

  function horseCell(runner) {
    const race = runnerRace(runner);
    return '<div class="horse-cell">' +
      '<span class="horse-sub">R' + race.no + " · " + esc(race.time) + " · No. " + runner.no + " · B" + runner.barrier + "</span>" +
      '<button class="horse-link" data-open-runner="' + runner.id + '">' + esc(runner.horse) + "</button>" +
      angleBadgeHTML(runner) +
      "</div>";
  }

  function emptyRow(colspan, message) {
    return '<tr><td class="empty" colspan="' + colspan + '">' + esc(message) + "</td></tr>";
  }

  function syncTableFades() {
    document.querySelectorAll(".table-frame").forEach(function (frame) {
      const wrap = frame.querySelector(".table-wrap");
      if (!wrap) return;
      const max = wrap.scrollWidth - wrap.clientWidth;
      frame.classList.toggle("is-scrollable", max > 2);
      frame.classList.toggle("is-at-end", max > 2 && wrap.scrollLeft >= max - 2);
    });
  }

  function shortlistTable(metricHeaders, rows, metricCells, emptyMessage) {
    const headers = ["Race", "Time", "No.", "Horse", "Barrier", "Jockey", "Trainer"].concat(metricHeaders);
    let head = "<tr>";
    headers.forEach(function (header) {
      let cls = "";
      if (header === "Horse") cls = ' class="col-horse"';
      else if (header === "No.") cls = ' class="col-no num"';
      else if (header === "Race") cls = ' class="col-race num"';
      else if (header === "Time") cls = ' class="col-time num"';
      else if (header === "Barrier") cls = ' class="col-barrier num"';
      head += "<th" + cls + ">" + esc(header) + "</th>";
    });
    head += "</tr>";

    let body = "";
    if (!rows.length) {
      body = emptyRow(headers.length, emptyMessage);
    } else {
      rows.forEach(function (runner) {
        const race = runnerRace(runner);
        body += "<tr>" +
          '<td class="col-race num">R' + race.no + "</td>" +
          '<td class="col-time num muted">' + esc(race.time) + "</td>" +
          '<td class="col-no num"><span class="saddlecloth saddlecloth--sm">' + runner.no + "</span></td>" +
          '<td class="col-horse">' + horseCell(runner) + "</td>" +
          '<td class="col-barrier num">' + runner.barrier + "</td>" +
          "<td>" + esc(runner.jockey) + "</td>" +
          "<td>" + esc(runner.trainer) + "</td>" +
          metricCells(runner) +
          "</tr>";
      });
    }

    return '<div class="table-frame"><div class="table-wrap"><table class="data-table shortlist-table"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div></div>";
  }

  function dropperBody(rows) {
    return shortlistTable(
      ["ClsDiff"],
      rows,
      function (runner) {
        return '<td class="num"><span class="pill pill--green">' + signed(runner.clsDiff, 1) + "</span></td>";
      },
      "No runners at this threshold. Raise the ClsDiff value."
    );
  }

  function hotFormBody(rows) {
    return shortlistTable(
      ["KRI"],
      rows,
      function (runner) {
        return '<td class="num"><span class="pill pill--green">' + runner.kri + "</span></td>";
      },
      "No runners at this KRI. Lower the slider."
    );
  }

  function closersBody(rows) {
    return shortlistTable(
      ["L600 Var L", "L200 Var L"],
      rows,
      function (runner) {
        return '<td class="num"><span class="pill pill--green">' + signed(runner.fml600, 1) + "</span></td>" +
          '<td class="num"><span class="pill pill--green">' + signed(runner.fml200, 1) + "</span></td>";
      },
      "No runners at both thresholds. Lower L600 or L200."
    );
  }

  function meetingBanner() {
    const meeting = currentMeeting();
    const races = currentRaces();
    return '<div class="meeting-banner">' +
      '<div class="meeting-banner__main"><span class="live-dot" aria-hidden="true"></span>' +
      "<strong>" + esc(meeting.track) + "</strong><span>" + fmtDate(meeting.date) + "</span>" +
      '<span class="demo-tag">Sample data</span></div>' +
      '<div class="meeting-banner__facts">' +
      "<span>" + esc(meeting.condition) + "</span>" +
      "<span>Rail " + esc(meeting.rail) + "</span>" +
      "<span>" + races.length + " races</span>" +
      "<span>" + meetingRunners().length + " runners</span>" +
      '<span class="wa-fact">WA only</span>' +
      "</div></div>";
  }

  function pageHead(eyebrow, title, copy) {
    return '<div class="page-head"><div>' +
      '<div class="eyebrow">' + esc(eyebrow) + "</div>" +
      "<h1>" + esc(title) + "</h1>" +
      "<p>" + esc(copy) + "</p>" +
      "</div></div>";
  }

  /* ---------------- shortlists ---------------- */

  function shortlistCard(options) {
    return '<section class="card" aria-labelledby="' + options.id + '-title">' +
      '<div class="card__head">' +
      '<div class="card__intro"><div class="eyebrow">' + esc(options.eyebrow) + "</div>" +
      '<h2 id="' + options.id + '-title">' + esc(options.title) + "</h2>" +
      "<p>" + esc(options.note) + "</p></div>" +
      '<div class="card__controls">' + options.control + "</div>" +
      "</div>" +
      '<div id="' + options.id + '-table">' + options.body + "</div>" +
      '<div class="card__foot"><span id="' + options.id + '-count"></span><span class="foot-hint">' + esc(options.hint) + '</span></div>' +
      "</section>";
  }

  function renderShortlists() {
    const dropperRows = classDroppers(state.maxClsDiff);
    const hotRows = hotForm(state.minKri);
    const closerRows = closers(state.minL600, state.minL200);

    const dropperControl =
      '<label for="maxClsDiff">ClsDiff ≤</label>' +
      '<input id="maxClsDiff" type="number" step="0.5" inputmode="decimal" value="' + state.maxClsDiff.toFixed(1) + '" aria-label="Maximum class difference">';

    const hotControl =
      '<label for="minKri">KRI ≥</label>' +
      '<input id="minKri" type="range" min="40" max="90" step="1" value="' + state.minKri + '" aria-label="Minimum key race index">' +
      '<output id="kriOut" for="minKri">' + state.minKri + "</output>";

    const closerControl =
      '<label for="minL600">L600 ≥</label>' +
      '<input id="minL600" type="number" step="0.5" inputmode="decimal" value="' + state.minL600.toFixed(1) + '" aria-label="Minimum L600 variance">' +
      '<label for="minL200">L200 ≥</label>' +
      '<input id="minL200" type="number" step="0.5" inputmode="decimal" value="' + state.minL200.toFixed(1) + '" aria-label="Minimum L200 variance">';

    $("#view").innerHTML =
      meetingBanner() +
      pageHead(
        "Ascot · Saturday 7 November",
        "Saturday shortlists",
        "Three filters from the brief, live on a sample WA meeting. Tap a horse to open its 200m splits."
      ) +
      '<div class="shortlist-stack">' +
      shortlistCard({
        id: "droppers", eyebrow: "Class", title: "Class Droppers",
        note: "Runners that step down in class from their last start (negative ClsDiff).",
        hint: "Sorted by race, then by the size of the drop.",
        control: dropperControl, body: dropperBody(dropperRows),
      }) +
      shortlistCard({
        id: "hotform", eyebrow: "Form", title: "Hot Form Lines",
        note: "Upcoming runners from a past race with a high Key Race Index.",
        hint: "KRI ≥ 70 is the default. Drag the slider to tighten the line.",
        control: hotControl, body: hotFormBody(hotRows),
      }) +
      shortlistCard({
        id: "closers", eyebrow: "Sectionals", title: "Elite Closers",
        note: "Hidden finishing speed, measured over the final 600m and the final 200m.",
        hint: "L600 is the last three 200m segments. Both thresholds must pass.",
        control: closerControl, body: closersBody(closerRows),
      }) +
      "</div>";

    updateShortlistMeta(dropperRows, hotRows, closerRows);
    syncTableFades();
  }

  function updateShortlistMeta(dropperRows, hotRows, closerRows) {
    $("#droppers-count").textContent = dropperRows.length + " runners · ClsDiff ≤ " + state.maxClsDiff.toFixed(1);
    $("#hotform-count").textContent = hotRows.length + " runners · KRI ≥ " + state.minKri;
    $("#closers-count").textContent = closerRows.length + " runners · L600 ≥ " + state.minL600.toFixed(1) + ", L200 ≥ " + state.minL200.toFixed(1);
  }

  function updateShortlists() {
    const dropperRows = classDroppers(state.maxClsDiff);
    const hotRows = hotForm(state.minKri);
    const closerRows = closers(state.minL600, state.minL200);
    $("#droppers-table").innerHTML = dropperBody(dropperRows);
    $("#hotform-table").innerHTML = hotFormBody(hotRows);
    $("#closers-table").innerHTML = closersBody(closerRows);
    updateShortlistMeta(dropperRows, hotRows, closerRows);
    updateApiPanel();
    syncTableFades();
  }

  /* ---------------- speed maps ---------------- */

  function speedMapCard(map) {
    const race = map.race;
    const paceClass = map.pace.toLowerCase();
    const laneHTML = map.lanes.map(function (lane) {
      const chips = lane.runners.length
        ? lane.runners.map(function (runner) {
            return '<button class="lane-chip" data-open-runner="' + runner.id + '" title="' + esc(runner.horse + " · " + runner.runStyle + " · PrSe " + runner.prSe) + '">' +
              '<span class="lane-chip__no">' + runner.no + "</span>" +
              '<span class="lane-chip__name">' + esc(runner.horse) + "</span>" +
              '<span class="lane-chip__se">' + runner.prSe + "</span>" +
              "</button>";
          }).join("")
        : '<span class="lane-empty">—</span>';
      return '<div class="lane lane--' + lane.key + '">' +
        '<div class="lane__label"><strong>' + lane.label + "</strong><span>" + lane.range + "</span></div>" +
        '<div class="lane__runners">' + chips + "</div>" +
        "</div>";
    }).join("");

    return '<section class="card speed-card" aria-label="Race ' + race.no + ' speed map">' +
      '<div class="card__head">' +
      '<div class="card__intro"><div class="eyebrow">Race ' + race.no + " · " + esc(race.time) + " · " + race.dist + "m</div>" +
      "<h2>" + esc(race.cls) + "</h2>" +
      "<p>" + map.leaders.length + " leader" + (map.leaders.length === 1 ? "" : "s") + " with PrSe ≤ 2</p></div>" +
      '<span class="pace pace--' + paceClass + '">' + map.pace + " pace</span>" +
      "</div>" +
      '<div class="lanes">' + laneHTML + "</div>" +
      "</section>";
  }

  function renderSpeedmaps() {
    const maps = currentRaces().map(function (race) { return speedMap(race.id); });
    $("#view").innerHTML =
      meetingBanner() +
      pageHead(
        "Automated speed maps",
        "Projected early pace",
        "Each runner sits in one lane from its predicted settle. Leader count sets the pace label."
      ) +
      '<div class="pace-legend">' +
      '<span><b>Slow</b> 0–1 leaders</span><span><b>Genuine</b> 2 leaders</span><span><b>Fast</b> 3+ leaders</span>' +
      "</div>" +
      '<div class="speed-grid">' + maps.map(speedMapCard).join("") + "</div>";
  }

  /* ---------------- angles ---------------- */

  function angleStatsCells(a, minStarts) {
    const enough = a.starts >= minStarts;
    const cls = enough ? "" : " muted";
    const srPill = enough && a.sr >= 25
      ? '<span class="pill pill--green">' + a.sr.toFixed(1) + "%</span>"
      : '<span class="num' + cls + '">' + a.sr.toFixed(1) + "%</span>";
    const roiPill = enough && a.roi > 0
      ? '<span class="pill pill--gold">' + pct(a.roi) + "</span>"
      : '<span class="num' + (a.roi < 0 ? " neg" : cls) + '">' + pct(a.roi) + "</span>";
    return '<td class="num' + cls + '">' + a.starts + "</td>" +
      '<td class="num' + cls + '">' + a.wins + "</td>" +
      "<td>" + srPill + "</td>" +
      "<td>" + roiPill + "</td>";
  }

  function anglesTableHTML() {
    const rows = angles(state.angleKind).filter(function (record) {
      return ANGLE_KEYS.some(function (key) { return record.angles[key].starts >= state.minStarts; });
    });

    let head = '<tr><th rowspan="2" class="col-name">' + (state.angleKind === "trainer" ? "Trainer" : "Jockey") + "</th>";
    ANGLE_KEYS.forEach(function (key) {
      head += '<th colspan="4" class="angle-head">' + ANGLE_LABELS[key] + "</th>";
    });
    head += "</tr><tr>";
    ANGLE_KEYS.forEach(function () {
      head += '<th class="num">Starts</th><th class="num">W</th><th class="num">SR%</th><th class="num">ROI%</th>';
    });
    head += "</tr>";

    let body = "";
    if (!rows.length) {
      body = emptyRow(13, "No names have enough starts at this minimum.");
    } else {
      rows.forEach(function (record) {
        body += "<tr>" +
          '<td class="col-name"><strong>' + esc(record.name) + '</strong><span class="sub">' + record.starts + " starts</span></td>";
        ANGLE_KEYS.forEach(function (key) {
          body += angleStatsCells(record.angles[key], state.minStarts);
        });
        body += "</tr>";
      });
    }

    return '<div class="table-frame"><div class="table-wrap"><table class="data-table angles-table"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div></div>";
  }

  function renderAngles() {
    const isTrainer = state.angleKind === "trainer";
    $("#view").innerHTML =
      meetingBanner() +
      pageHead(
        "Trainer and jockey patterns",
        "Angle strike rates and ROI",
        "Calculated from 152 past starts. $1 level stakes. 1st-up, 2nd-up and backing up within 7 days."
      ) +
      '<section class="card" aria-labelledby="angles-title">' +
      '<div class="card__head">' +
      '<div class="card__intro"><div class="eyebrow">Patterns</div><h2 id="angles-title">' + (isTrainer ? "Trainers" : "Jockeys") + "</h2>" +
      "<p>Positive ROI and a strike rate of 25% or more get a flag.</p></div>" +
      '<div class="card__controls card__controls--stack">' +
      '<div class="segmented" role="group" aria-label="Stats type">' +
      '<button type="button" data-kind="trainer" aria-pressed="' + (isTrainer ? "true" : "false") + '" class="' + (isTrainer ? "is-active" : "") + '">Trainer</button>' +
      '<button type="button" data-kind="jockey" aria-pressed="' + (!isTrainer ? "true" : "false") + '" class="' + (!isTrainer ? "is-active" : "") + '">Jockey</button>' +
      "</div>" +
      '<label class="min-starts" for="minStarts">Min starts <input id="minStarts" type="number" min="1" max="20" step="1" value="' + state.minStarts + '" aria-label="Minimum starts"></label>' +
      "</div></div>" +
      '<div id="anglesTableWrap">' + anglesTableHTML() + "</div>" +
      '<div class="card__foot legend">' +
      '<span><span class="legend-dot legend-dot--green"></span>SR ≥ 25%</span>' +
      '<span><span class="legend-dot legend-dot--gold"></span>ROI > 0</span>' +
      '<span class="foot-hint">Grey = below the minimum starts</span>' +
      "</div></section>";

    syncTableFades();
  }

  function updateAnglesTable() {
    $("#anglesTableWrap").innerHTML = anglesTableHTML();
    syncTableFades();
  }

  /* ---------------- runner modal ---------------- */

  function upLabel(runner) {
    if (runner.upNumber === 1) return "1st-up";
    if (runner.upNumber === 2) return "2nd-up";
    return "3rd-up+";
  }

  function varianceChart(segments) {
    const n = segments.length;
    const gap = 64;
    const width = Math.max(300, n * gap + 20);
    const zero = 96;
    const maxBar = 42;
    const maxAbs = Math.max(1.5, Math.max.apply(null, segments.map(function (s) { return Math.abs(s.varL); })));
    let content = "";

    segments.forEach(function (segment, i) {
      const center = 10 + i * gap + gap / 2;
      const h = Math.abs(segment.varL) / maxAbs * maxBar;
      const positive = segment.varL >= 0;
      const y = positive ? zero - h : zero;
      const valueY = positive ? zero - h - 7 : zero + h + 15;
      content += '<rect class="chart-bar ' + (positive ? "chart-bar--fast" : "chart-bar--slow") + '" x="' + (center - 14) + '" y="' + y + '" width="28" height="' + Math.max(h, 1) + '" rx="4">' +
        "<title>" + segment.distFrom + "–" + segment.distTo + "m: " + signed(segment.varL, 1) + "L</title></rect>";
      content += '<text class="chart-value" x="' + center + '" y="' + valueY + '" text-anchor="middle">' + signed(segment.varL, 1) + "</text>";
      content += '<text class="chart-label" x="' + center + '" y="188" text-anchor="middle">' + segment.distFrom + "</text>";
    });

    return '<svg class="chart" viewBox="0 0 ' + width + ' 200" width="' + width + '" height="200" role="img" aria-label="Variance from benchmark in the last start, by 200 metre segment. Segment start distance is shown below each bar.">' +
      '<line class="chart-zero" x1="6" y1="' + zero + '" x2="' + (width - 6) + '" y2="' + zero + '"></line>' +
      content +
      "</svg>";
  }

  function openRunner(runnerId) {
    const runner = runnerById(runnerId);
    if (!runner) return;
    const race = runnerRace(runner);
    const meeting = currentMeeting();
    const segs = sectionals(runnerId);
    const badge = findAngleBadge(runner);

    const stats = [
      ["Weight", runner.weight.toFixed(1) + " kg"],
      ["Barrier", runner.barrier],
      ["Jockey", runner.jockey],
      ["Trainer", runner.trainer],
      ["Run style", runner.runStyle],
      ["Predicted settle", "PrSe " + runner.prSe],
      ["KRI", runner.kri],
      ["ClsDiff", signed(runner.clsDiff, 1)],
      ["Last start", runner.lastStart.dist + "m at " + runner.lastStart.track],
      ["Days since", runner.daysSinceLast],
      ["Up number", upLabel(runner)],
      ["L600 / L200", signed(runner.fml600, 1) + " / " + signed(runner.fml200, 1)],
    ];

    const splitRows = segs.map(function (segment) {
      return "<tr>" +
        "<td>" + segment.distFrom + "–" + segment.distTo + "</td>" +
        '<td class="num">' + segment.split.toFixed(2) + "</td>" +
        '<td class="num">' + segment.benchmark.toFixed(2) + "</td>" +
        '<td class="num ' + (segment.varL >= 0 ? "pos" : "neg") + '">' + signed(segment.varL, 1) + "</td>" +
        "</tr>";
    }).join("");

    $("#modalBody").innerHTML =
      '<div class="modal__head">' +
      '<div><div class="eyebrow">Race ' + race.no + " · " + race.time + " · " + race.dist + "m " + esc(race.cls) + " · " + esc(meeting.track) + "</div>" +
      '<h2 id="modalTitle"><span class="saddlecloth">' + runner.no + "</span> " + esc(runner.horse) + "</h2>" +
      '<p class="modal__sub">' + esc(runner.trainer) + " · " + esc(runner.jockey) + " · " + runner.weight.toFixed(1) + " kg</p>" +
      (badge ? '<span class="angle-flag angle-flag--lg" title="' + esc(badge.name + " · " + ANGLE_LABELS[badge.key] + ": " + badge.starts + " starts, " + badge.wins + " wins") + '">' + esc((badge.kind === "trainer" ? "Trainer" : "Jockey") + " " + ANGLE_SHORT[badge.key] + " " + pct(badge.roi) + " ROI") + "</span>" : "") +
      "</div>" +
      "</div>" +

      '<div class="stat-grid">' + stats.map(function (item) {
        return '<div class="stat"><span>' + esc(item[0]) + "</span><strong>" + esc(item[1]) + "</strong></div>";
      }).join("") + "</div>" +

      '<div class="modal__section">' +
      '<div class="section-title"><h3>Last-start 200m splits</h3><span>' + runner.lastStart.dist + "m · " + esc(runner.lastStart.track) + " · " + fmtDate(runner.lastStart.date) + "</span></div>" +
      '<div class="chart-wrap"><div class="chart-scroll">' + varianceChart(segs) + "</div></div>" +
      '<div class="chart-key"><span><i class="key key--fast"></i>faster than benchmark</span><span><i class="key key--slow"></i>slower than benchmark</span></div>' +
      '<div class="table-wrap"><table class="data-table splits-table"><thead><tr><th>Segment</th><th class="num">Split (s)</th><th class="num">Benchmark (s)</th><th class="num">Var (L)</th></tr></thead><tbody>' + splitRows + "</tbody></table></div>" +
      '<p class="note">Bars show each 200m segment. Labels show segment start distance. Var L = (benchmark − split) × 6 lengths per second. Green is faster than benchmark.</p>' +
      "</div>" +

      '<div class="modal__foot"><span>' + segs.length + ' × 200m segments</span><span>L600 ' + signed(runner.fml600, 1) + " · L200 " + signed(runner.fml200, 1) + "</span></div>";

    const modal = $("#runnerModal");
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    $("#modalClose").focus();
  }

  function closeModal() {
    const modal = $("#runnerModal");
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  /* ---------------- under the hood ---------------- */

  const DDL = [
    "-- Raw-first: every payload is kept, typed columns sit beside it.",
    "create table meetings (",
    "  id            bigint generated always as identity primary key,",
    "  meeting_date  date not null,",
    "  track         text not null,",
    "  state         char(3) not null references config_states(code),",
    "  rail          text,",
    "  condition     text,",
    "  raw           jsonb not null,",
    "  ingested_at   timestamptz not null default now(),",
    "  unique (meeting_date, track, state)",
    ");",
    "",
    "create table races (",
    "  id          bigint generated always as identity primary key,",
    "  meeting_id  bigint not null references meetings(id) on delete cascade,",
    "  race_no     smallint not null,",
    "  start_time  timestamptz not null,",
    "  distance_m  smallint not null,",
    "  class       text,",
    "  raw         jsonb not null,",
    "  unique (meeting_id, race_no)",
    ");",
    "",
    "create table runners (",
    "  id               bigint generated always as identity primary key,",
    "  race_id          bigint not null references races(id) on delete cascade,",
    "  runner_no        smallint not null,",
    "  horse            text not null,",
    "  barrier          smallint,",
    "  jockey           text,",
    "  trainer          text,",
    "  weight_kg        numeric(4,1),",
    "  cls_diff         numeric(4,1),",
    "  kri              smallint,",
    "  fml600           numeric(4,1),",
    "  fml200           numeric(4,1),",
    "  run_style        text,",
    "  pr_se            smallint,",
    "  days_since_last  smallint,",
    "  up_number        smallint,",
    "  raw              jsonb not null,",
    "  unique (race_id, runner_no)",
    ");",
    "",
    "-- Sequential splits: one row per 200m segment.",
    "-- segment_idx 0 = final 200m, so idx <= 2 is the final 600m.",
    "create table sectionals (",
    "  runner_id    bigint not null references runners(id) on delete cascade,",
    "  segment_idx  smallint not null,",
    "  dist_from    smallint not null,",
    "  dist_to      smallint not null,",
    "  split_s      numeric(5,2) not null,",
    "  benchmark_s  numeric(5,2) not null,",
    "  var_l        numeric(4,1) generated always as",
    "                 (round((benchmark_s - split_s) * 6, 1)) stored,",
    "  raw          jsonb not null,",
    "  primary key (runner_id, segment_idx)",
    ");",
    "",
    "-- L600 queries read only the final three rows per runner.",
    "create index sectionals_final600_idx",
    "  on sectionals (runner_id, segment_idx)",
    "  include (var_l)",
    "  where segment_idx <= 2;",
    "",
    "create index runners_kri_idx on runners (kri desc) where kri >= 70;",
    "create index runners_cls_diff_idx on runners (cls_diff) where cls_diff < 0;",
    "",
    "-- starters: normalised past starts (trainer, jockey, up_number,",
    "-- days_since_last, won, sp). Refreshed after each harvest.",
    "create materialized view trainer_angle_stats as",
    "select trainer,",
    "       angle,",
    "       count(*) as starts,",
    "       count(*) filter (where won) as wins,",
    "       round(100.0 * count(*) filter (where won) / count(*), 1) as sr_pct,",
    "       round(100.0 * (sum(case when won then sp else 0 end) - count(*))",
    "             / count(*), 1) as roi_pct",
    "from (",
    "  select trainer, won, sp,",
    "         case when up_number = 1 then 'first_up'",
    "              when up_number = 2 then 'second_up'",
    "              when days_since_last <= 7 then 'back_up'",
    "         end as angle",
    "  from starters",
    ") s",
    "where angle is not null",
    "group by trainer, angle;",
    "",
    "create unique index trainer_angle_stats_pk",
    "  on trainer_angle_stats (trainer, angle);",
    "",
    "-- State switch. WA is on; other states stay off until enabled.",
    "create table config_states (",
    "  code     char(3) primary key,",
    "  name     text not null,",
    "  enabled  boolean not null default false",
    ");",
  ].join("\n");

  const CONFIG_SNIPPET = [
    "# config.yaml — add a state without a code change",
    "states:",
    "  WA:  true    # Western Australia",
    "  VIC: false",
    "  NSW: false",
    "  QLD: false",
    "  SA:  false",
    "  TAS: false",
    "  NT:  false",
  ].join("\n");

  const ENDPOINTS = [
    ["GET", "/shortlists?state=WA&date=2026-11-07", "All three shortlists"],
    ["GET", "/shortlists/class-droppers?state=WA&date=2026-11-07&max_clsdiff=-1", "Class droppers"],
    ["GET", "/shortlists/kri?state=WA&date=2026-11-07&min_kri=70", "Hot form lines"],
    ["GET", "/shortlists/closers?state=WA&date=2026-11-07&min_l600=2&min_l200=1", "Elite closers"],
    ["GET", "/races/{race_id}/speedmap", "Lanes and pace label"],
    ["GET", "/angles/{kind}?min_starts=3", "Trainer or jockey angles"],
    ["GET", "/runners/{runner_id}/sectionals", "200m split detail"],
    ["GET", "/shortlist.html?state=WA", "Mobile-ready shortlist page"],
  ];

  function apiUrl() {
    const meeting = currentMeeting();
    return "/shortlists?state=" + meeting.state +
      "&date=" + meeting.date +
      "&max_clsdiff=" + state.maxClsDiff.toFixed(1) +
      "&min_kri=" + state.minKri +
      "&min_l600=" + state.minL600.toFixed(1) +
      "&min_l200=" + state.minL200.toFixed(1);
  }

  function apiPayload() {
    const meeting = currentMeeting();
    const droppers = classDroppers(state.maxClsDiff);
    const hot = hotForm(state.minKri);
    const close = closers(state.minL600, state.minL200);

    return {
      state: meeting.state,
      date: meeting.date,
      meeting: meeting.track,
      filters: {
        max_clsdiff: round(state.maxClsDiff, 1),
        min_kri: state.minKri,
        min_l600: round(state.minL600, 1),
        min_l200: round(state.minL200, 1),
      },
      counts: {
        class_droppers: droppers.length,
        hot_form: hot.length,
        elite_closers: close.length,
      },
      class_droppers: droppers.map(function (r) {
        return { race: runnerRace(r).no, time: runnerRace(r).time, no: r.no, horse: r.horse, cls_diff: r.clsDiff };
      }),
      hot_form: hot.map(function (r) {
        return { race: runnerRace(r).no, time: runnerRace(r).time, no: r.no, horse: r.horse, kri: r.kri };
      }),
      elite_closers: close.map(function (r) {
        return { race: runnerRace(r).no, time: runnerRace(r).time, no: r.no, horse: r.horse, l600_var: r.fml600, l200_var: r.fml200 };
      }),
    };
  }

  function updateApiPanel() {
    const jsonEl = $("#apiJson");
    if (!jsonEl) return;
    const urlEl = $("#apiUrl");
    if (urlEl) urlEl.textContent = apiUrl();
    jsonEl.textContent = JSON.stringify(apiPayload(), null, 2);
  }

  function renderHood() {
    $("#view").innerHTML =
      meetingBanner() +
      pageHead(
        "Under the hood",
        "Pipeline and API shape",
        "The demo is static. The production version runs this pipeline in Python, PostgreSQL and FastAPI."
      ) +
      '<div class="pipe" aria-label="Data pipeline">' +
      ["cron 05:00 AWST|daily trigger", "Harvester|Requests · state filter", "Raw JSONB|store everything", "Pandas|normalise", "PostgreSQL|sectional index", "FastAPI|filters and angles", "HTML table|phone-ready"].map(function (step, i) {
        const parts = step.split("|");
        return (i ? '<span class="pipe__arrow" aria-hidden="true">→</span>' : "") +
          '<div class="pipe__step"><strong>' + esc(parts[0]) + "</strong><span>" + esc(parts[1]) + "</span></div>";
      }).join("") +
      "</div>" +
      '<div class="hood-grid">' +
      '<section class="card code-card"><div class="card__head"><div class="card__intro"><div class="eyebrow">Schema</div><h2>PostgreSQL DDL</h2><p>Raw JSONB beside typed columns. The final 600m has its own partial index.</p></div></div>' +
      '<pre class="code"><code>' + esc(DDL) + "</code></pre></section>" +
      '<div class="hood-side">' +
      '<section class="card"><div class="card__head"><div class="card__intro"><div class="eyebrow">Routes</div><h2>FastAPI endpoints</h2><p>Each shortlist is one GET request with filters.</p></div></div>' +
      '<div class="endpoint-list">' + ENDPOINTS.map(function (row) {
        return '<div class="endpoint"><span class="method">' + row[0] + "</span><code>" + esc(row[1]) + "</code><span>" + esc(row[2]) + "</span></div>";
      }).join("") + "</div></section>" +
      '<section class="card"><div class="card__head"><div class="card__intro"><div class="eyebrow">Switch</div><h2>State config</h2><p>Turn on another state without a code change.</p></div></div>' +
      '<pre class="code code--small"><code>' + esc(CONFIG_SNIPPET) + "</code></pre></section>" +
      "</div></div>" +
      '<section class="card api-card" aria-labelledby="api-title">' +
      '<div class="card__head"><div class="card__intro"><div class="eyebrow">Live</div><h2 id="api-title">Current filter as API call</h2>' +
      "<p>The Shortlists thresholds feed this request and response. Change them here or on the Shortlists tab.</p></div>" +
      '<button type="button" class="btn" id="copyApi">Copy request</button></div>' +
      '<div class="api-filters">' +
      '<label for="apiClsDiff">ClsDiff ≤ <input id="apiClsDiff" type="number" step="0.5" inputmode="decimal" value="' + state.maxClsDiff.toFixed(1) + '"></label>' +
      '<label for="apiKri">KRI ≥ <input id="apiKri" type="number" step="1" min="0" max="99" inputmode="numeric" value="' + state.minKri + '"></label>' +
      '<label for="apiL600">L600 ≥ <input id="apiL600" type="number" step="0.5" inputmode="decimal" value="' + state.minL600.toFixed(1) + '"></label>' +
      '<label for="apiL200">L200 ≥ <input id="apiL200" type="number" step="0.5" inputmode="decimal" value="' + state.minL200.toFixed(1) + '"></label>' +
      '<span class="api-hint">Updates live</span>' +
      "</div>" +
      '<div class="api-url"><span class="method">GET</span><code id="apiUrl">' + esc(apiUrl()) + "</code></div>" +
      '<pre class="code code--json" id="apiJson">' + esc(JSON.stringify(apiPayload(), null, 2)) + "</pre>" +
      "</section>";
  }

  /* ---------------- shell and routing ---------------- */

  function buildHeader() {
    const select = $("#meetingSelect");
    const enabledMeetings = filterByState(D.meetings);
    select.innerHTML = enabledMeetings.map(function (meeting) {
      const shortDate = fmtDate(meeting.date).replace(/\s\d{4}$/, "");
      return '<option value="' + meeting.id + '"' + (meeting.id === state.meetingId ? " selected" : "") + ">" +
        esc(meeting.track + " · " + shortDate) + "</option>";
    }).join("");

    if (!enabledMeetings.some(function (m) { return m.id === state.meetingId; }) && enabledMeetings.length) {
      state.meetingId = enabledMeetings[0].id;
    }

    const chips = $("#stateChips");
    chips.innerHTML = Object.keys(CFG.states).map(function (code) {
      const on = CFG.states[code];
      return '<button type="button" class="state-chip' + (on ? " is-on" : "") + '"' +
        (on ? ' aria-pressed="true"' : ' disabled aria-pressed="false"') +
        ">" + code + "</button>";
    }).join("");

    select.addEventListener("change", function (event) {
      state.meetingId = Number(event.target.value);
      render();
    });
  }

  function setActiveTab() {
    document.querySelectorAll(".tab").forEach(function (tab) {
      const on = tab.getAttribute("data-tab") === state.tab;
      if (on) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  function render() {
    setActiveTab();
    if (state.tab === "speedmaps") renderSpeedmaps();
    else if (state.tab === "angles") renderAngles();
    else if (state.tab === "hood") renderHood();
    else renderShortlists();
  }

  function tabFromHash() {
    const hash = window.location.hash.replace("#", "");
    return TABS.indexOf(hash) !== -1 ? hash : "shortlists";
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("is-visible");
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () { el.classList.remove("is-visible"); }, 1800);
  }

  function copyApi() {
    const text = "GET " + apiUrl() + "\n\n" + JSON.stringify(apiPayload(), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Request copied"); }, function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      toast("Request copied");
    } catch (error) {
      toast("Copy failed. Select the text.");
    }
    document.body.removeChild(area);
  }

  function bindEvents() {
    window.addEventListener("hashchange", function () {
      closeModal();
      state.tab = tabFromHash();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.addEventListener("scroll", function (event) {
      if (event.target && event.target.classList && event.target.classList.contains("table-wrap")) {
        syncTableFades();
      }
    }, true);
    window.addEventListener("resize", syncTableFades);

    document.addEventListener("click", function (event) {
      const runnerBtn = event.target.closest("[data-open-runner]");
      if (runnerBtn) {
        openRunner(Number(runnerBtn.getAttribute("data-open-runner")));
        return;
      }

      if (event.target.closest("[data-close-modal]") || event.target.closest("#modalClose")) {
        closeModal();
        return;
      }

      const kindBtn = event.target.closest("[data-kind]");
      if (kindBtn) {
        state.angleKind = kindBtn.getAttribute("data-kind");
        renderAngles();
        return;
      }

      if (event.target.closest("#copyApi")) copyApi();
    });

    document.addEventListener("input", function (event) {
      const id = event.target.id;
      if (id === "maxClsDiff") {
        const value = parseFloat(event.target.value);
        if (!Number.isNaN(value)) {
          state.maxClsDiff = value;
          updateShortlists();
        }
      } else if (id === "minKri") {
        state.minKri = Number(event.target.value);
        const out = $("#kriOut");
        if (out) out.textContent = state.minKri;
        updateShortlists();
      } else if (id === "minL600") {
        const value = parseFloat(event.target.value);
        if (!Number.isNaN(value)) {
          state.minL600 = value;
          updateShortlists();
        }
      } else if (id === "minL200") {
        const value = parseFloat(event.target.value);
        if (!Number.isNaN(value)) {
          state.minL200 = value;
          updateShortlists();
        }
      } else if (id === "minStarts") {
        const value = parseInt(event.target.value, 10);
        if (!Number.isNaN(value) && value >= 1) {
          state.minStarts = value;
          updateAnglesTable();
        }
      } else if (id === "apiClsDiff") {
        const value = parseFloat(event.target.value);
        if (!Number.isNaN(value)) {
          state.maxClsDiff = value;
          updateApiPanel();
        }
      } else if (id === "apiKri") {
        const value = parseInt(event.target.value, 10);
        if (!Number.isNaN(value)) {
          state.minKri = value;
          updateApiPanel();
        }
      } else if (id === "apiL600") {
        const value = parseFloat(event.target.value);
        if (!Number.isNaN(value)) {
          state.minL600 = value;
          updateApiPanel();
        }
      } else if (id === "apiL200") {
        const value = parseFloat(event.target.value);
        if (!Number.isNaN(value)) {
          state.minL200 = value;
          updateApiPanel();
        }
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
  }

  buildHeader();
  bindEvents();
  state.tab = tabFromHash();
  render();
})();
