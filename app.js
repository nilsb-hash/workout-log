"use strict";

/* ---------- Storage ---------- */
const KEY = "workoutlog.v1";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normalizeProgram(p) {
  // Turn [name, target] tuples into objects with stable ids.
  return {
    id: p.id, name: p.name, weeks: p.weeks, info: p.info, esd: p.esd,
    workouts: p.workouts.map(w => ({
      id: w.id, title: w.title, note: w.note || "",
      blocks: w.blocks.map((b, bi) => ({
        name: b.name,
        exercises: b.exercises.map((e, ei) => Array.isArray(e)
          ? { id: `${p.id}-${w.id}-${bi}-${ei}`, name: e[0], target: e[1] }
          : e)
      }))
    }))
  };
}

function freshState() {
  return {
    version: 1,
    athlete: "",
    unit: "kg",
    currentWeek: 7,
    activeProgramId: DEFAULT_PROGRAM.id,
    programs: [normalizeProgram(DEFAULT_PROGRAM)],
    sessions: []
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.programs) && Array.isArray(s.sessions)) return s;
    }
  } catch (e) { /* fall through */ }
  return freshState();
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    toast("Could not save. Export a backup now.");
  }
}

/* ---------- Helpers ---------- */
const $view = document.getElementById("view");
const $title = document.getElementById("title");
const $back = document.getElementById("back");
const $topright = document.getElementById("topright");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

const program = () => state.programs.find(p => p.id === state.activeProgramId) || state.programs[0];
const programById = id => state.programs.find(p => p.id === id) || program();
const workoutOf = (prog, wid) => prog.workouts.find(w => w.id === wid);

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function setCount(target) {
  const m = /^\s*(\d+)/.exec(target || "");
  return m ? Math.min(parseInt(m[1], 10), 10) : 3;
}

const label = (bi, ei) => String.fromCharCode(65 + bi) + (ei + 1);

const hasData = set => set && (String(set.w).trim() !== "" || String(set.r).trim() !== "");
const sessionHasData = s =>
  Object.values(s.sets || {}).some(arr => arr.some(hasData)) || s.esd || (s.notes || "").trim() || s.bodyweight;

function sortedSessions() {
  return [...state.sessions].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0));
}

function previousSets(session, exId) {
  for (const s of sortedSessions()) {
    if (s.id === session.id) continue;
    const isEarlier = (s.date || "") < (session.date || "") ||
      ((s.date || "") === (session.date || "") && (s.created || 0) < (session.created || 0));
    if (!isEarlier) continue;
    const arr = s.sets && s.sets[exId];
    if (arr && arr.some(hasData)) return { sets: arr, date: s.date, session: s };
  }
  return null;
}

// Each exercise can have its own unit; a session remembers the unit it was logged in.
function unitFor(e, s) {
  return (s && s.units && s.units[e.id]) || e.unit || state.unit;
}

function fmtSet(set, unit) {
  const w = String(set.w ?? "").trim(), r = String(set.r ?? "").trim();
  if (w && r) return `${w}${unit}×${r}`;
  if (w) return `${w}${unit}`;
  if (r) return `${r} reps`;
  return "";
}

function fmtSets(arr, unit) {
  return (arr || []).filter(hasData).map(s => fmtSet(s, unit)).join(", ");
}

/* ---------- Share text ---------- */
function sessionText(s) {
  const prog = programById(s.programId);
  const w = workoutOf(prog, s.workoutId);
  const unit = state.unit;
  const lines = [];
  lines.push(`WORKOUT ${s.workoutId}${w ? " – " + w.title : ""}`);
  const meta = [`Week ${s.week}`, fmtDate(s.date)];
  if (s.bodyweight) meta.push(`BW ${s.bodyweight} ${unit}`);
  lines.push(meta.join(" · "));
  if (w) {
    w.blocks.forEach((b, bi) => {
      b.exercises.forEach((e, ei) => {
        const done = fmtSets(s.sets[e.id], unitFor(e, s));
        lines.push(`${label(bi, ei)} ${e.name} (${e.target}): ${done || "–"}`);
      });
    });
  }
  lines.push(`ESD (${prog.esd || "conditioning"}): ${s.esd ? "✓ done" : "–"}`);
  if ((s.notes || "").trim()) lines.push(`Notes: ${s.notes.trim()}`);
  return lines.join("\n");
}

function weekText(week) {
  const list = state.sessions.filter(s => String(s.week) === String(week) && sessionHasData(s))
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.created || 0) - (b.created || 0));
  const head = `${state.athlete ? state.athlete + " – " : ""}${program().name} – Week ${week}`;
  return [head, "", ...list.map(sessionText).flatMap(t => [t, ""])].join("\n").trim();
}

async function shareText(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied – paste it to your coach");
  } catch (e) {
    showTextFallback(text);
  }
}

function showTextFallback(text) {
  const ta = document.createElement("textarea");
  ta.className = "fallback";
  ta.value = text;
  $view.prepend(ta);
  ta.select();
  toast("Select all and copy");
}

/* ---------- Router ---------- */
function setChrome(title, { back = false, right = "" } = {}) {
  $title.textContent = title;
  $back.hidden = !back;
  $topright.innerHTML = right;
  document.title = title === "Workout Log" ? title : `${title} – Workout Log`;
}

$back.addEventListener("click", () => {
  if (history.length > 1) history.back(); else location.hash = "#/";
});

let leaveHook = null;

function route() {
  if (leaveHook) { leaveHook(); leaveHook = null; }
  const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
  const tab = { history: "history", table: "history", settings: "settings", edit: "settings" }[parts[0]] || "home";
  document.querySelectorAll(".tabbar a").forEach(a =>
    a.classList.toggle("active", a.dataset.tab === tab));
  window.scrollTo(0, 0);
  switch (parts[0]) {
    case "log": return viewLog(parts[1]);
    case "history": return viewHistory();
    case "settings": return viewSettings();
    case "edit": return viewEdit(parts[1]);
    case "table": return viewTable(parts[1]);
    default: return viewHome();
  }
}
window.addEventListener("hashchange", route);

/* ---------- Home ---------- */
function viewHome() {
  setChrome("Workout Log");
  const prog = program();
  const wk = state.currentWeek;
  const thisWeek = state.sessions.filter(s => String(s.week) === String(wk) && sessionHasData(s));
  const weekOpts = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(n => `<option value="${n}" ${n == wk ? "selected" : ""}>Week ${n}</option>`).join("");

  $view.innerHTML = `
    <section class="hero">
      <div class="muted small">${esc(prog.name)} · weeks ${esc(prog.weeks)}</div>
      <div class="row">
        <select id="week" class="week-select" aria-label="Current week">${weekOpts}</select>
        <span class="pill">${thisWeek.length} done this week</span>
      </div>
      <div class="muted small">${esc(prog.info || "")}</div>
    </section>
    <section class="cards">
      ${prog.workouts.map(w => {
        const last = sortedSessions().find(s => s.workoutId === w.id && sessionHasData(s));
        const doneWk = thisWeek.some(s => s.workoutId === w.id);
        return `
        <button class="card workout" data-w="${esc(w.id)}">
          <span class="letter">${esc(w.id)}</span>
          <span class="card-body">
            <span class="card-title">${esc(w.title)}</span>
            <span class="muted small">${last ? "Last: " + fmtDate(last.date) + " (wk " + esc(last.week) + ")" : "Not logged yet"}</span>
          </span>
          ${doneWk ? '<span class="check" aria-label="Done this week">✓</span>' : ""}
        </button>`;
      }).join("")}
    </section>
    ${thisWeek.length ? `<button id="shareWeek" class="btn primary block">Share week ${wk} with coach</button>` : ""}
  `;

  $view.querySelector("#week").addEventListener("change", e => {
    state.currentWeek = parseInt(e.target.value, 10);
    save();
    viewHome();
  });
  $view.querySelectorAll(".workout").forEach(b =>
    b.addEventListener("click", () => startSession(b.dataset.w)));
  const sw = $view.querySelector("#shareWeek");
  if (sw) sw.addEventListener("click", () => shareText(`Week ${wk}`, weekText(wk)));
}

function startSession(workoutId) {
  const s = {
    id: uid(), created: Date.now(),
    programId: program().id, workoutId,
    date: today(), week: state.currentWeek,
    bodyweight: "", esd: false, notes: "", sets: {}
  };
  state.sessions.push(s);
  save();
  location.hash = `#/log/${s.id}`;
}

/* ---------- Log session ---------- */
function viewLog(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) { location.hash = "#/"; return; }
  const prog = programById(s.programId);
  const w = workoutOf(prog, s.workoutId);
  if (!w) { location.hash = "#/"; return; }
  const unit = state.unit;
  setChrome(`Workout ${w.id}`, { back: true });

  // Throw away sessions that were opened but never filled in.
  leaveHook = () => {
    if (!sessionHasData(s)) {
      state.sessions = state.sessions.filter(x => x.id !== s.id);
      save();
    }
  };

  w.blocks.forEach(b => b.exercises.forEach(e => {
    if (!s.sets[e.id]) s.sets[e.id] = Array.from({ length: setCount(e.target) }, () => ({ w: "", r: "" }));
  }));

  const weekOpts = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(n => `<option value="${n}" ${n == s.week ? "selected" : ""}>${n}</option>`).join("");

  $view.innerHTML = `<div id="log">
    <div class="subtitle">${esc(w.title)}</div>
    <section class="meta-grid">
      <label>Date<input type="date" id="date" value="${esc(s.date)}"></label>
      <label>Week<select id="wk">${weekOpts}</select></label>
      <label>Body weight<span class="with-unit"><input id="bw" inputmode="decimal" placeholder="–" value="${esc(s.bodyweight)}"><span>${unit}</span></span></label>
    </section>
    ${w.blocks.map((b, bi) => `
      <h2 class="block-h"><span>Block ${bi + 1}</span> ${esc(b.name)}</h2>
      ${b.exercises.map((e, ei) => exerciseCard(s, e, label(bi, ei))).join("")}
    `).join("")}
    <section class="card esd">
      <label class="checkline"><input type="checkbox" id="esd" ${s.esd ? "checked" : ""}>
        <span><strong>Post-lift ESD</strong><br><span class="muted small">${esc(prog.esd || "")}</span></span></label>
    </section>
    <label class="notes">Notes for coach
      <textarea id="notes" rows="3" placeholder="How did it feel? Pain, energy, technique…">${esc(s.notes)}</textarea></label>
    ${w.note ? `<p class="muted small">${esc(w.note)}</p>` : ""}
    <div class="actions">
      <button id="share" class="btn primary">Share with coach</button>
      <button id="done" class="btn">Done</button>
    </div>
    <button id="del" class="btn danger link">Delete this session</button>
  </div>`;

  bindLog(s, w);
}

function exerciseCard(s, e, lbl) {
  const prev = previousSets(s, e.id);
  const unit = unitFor(e, s);
  const sets = s.sets[e.id];
  return `
  <article class="card ex" data-ex="${esc(e.id)}">
    <header class="ex-head">
      <span class="lbl">${lbl}</span>
      <span class="ex-name">${esc(e.name)}</span>
      <span class="target">${esc(e.target)}</span>
      <button class="unit-toggle" aria-label="Weight unit, tap to switch">${unit}</button>
    </header>
    ${prev ? `<div class="prev small">Last (${fmtDate(prev.date)}): ${esc(fmtSets(prev.sets, unitFor(e, prev.session)))}</div>` : ""}
    <div class="sets">
      ${sets.map((set, i) => {
        const p = prev && prev.sets[i] ? prev.sets[i] : {};
        return `
        <div class="set" data-i="${i}">
          <span class="set-n">${i + 1}</span>
          <span class="with-unit"><input class="w" inputmode="decimal" placeholder="${esc(p.w || "–")}" value="${esc(set.w)}" aria-label="Set ${i + 1} weight"><span>${unit}</span></span>
          <span class="x">×</span>
          <span class="with-unit"><input class="r" inputmode="numeric" placeholder="${esc(p.r || "–")}" value="${esc(set.r)}" aria-label="Set ${i + 1} reps"><span>reps</span></span>
        </div>`;
      }).join("")}
    </div>
    <div class="ex-actions">
      ${prev ? '<button class="mini copy">Same as last</button>' : ""}
      <button class="mini fill">Copy set 1 down</button>
      <button class="mini add">+ Set</button>
      ${sets.length > 1 ? '<button class="mini remove">− Set</button>' : ""}
    </div>
  </article>`;
}

function bindLog(s, w) {
  const persist = () => save();
  const root = $view.querySelector("#log");
  const exById = id => w.blocks.flatMap(b => b.exercises).find(x => x.id === id);

  root.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "bw") s.bodyweight = t.value.trim();
    else if (t.id === "notes") s.notes = t.value;
    else {
      const row = t.closest(".set");
      const card = t.closest(".ex");
      if (!row || !card) return;
      const set = s.sets[card.dataset.ex][parseInt(row.dataset.i, 10)];
      if (t.classList.contains("w")) {
        set.w = t.value.trim();
        s.units = s.units || {};
        if (!s.units[card.dataset.ex]) s.units[card.dataset.ex] = unitFor(exById(card.dataset.ex), s);
      }
      if (t.classList.contains("r")) set.r = t.value.trim();
    }
    persist();
  });

  root.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "date") s.date = t.value;
    else if (t.id === "wk") s.week = parseInt(t.value, 10);
    else if (t.id === "esd") s.esd = t.checked;
    else return;
    persist();
  });

  root.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const card = btn.closest(".ex");
    if (card) {
      const exId = card.dataset.ex;
      const sets = s.sets[exId];
      if (btn.classList.contains("unit-toggle")) {
        const ex = exById(exId);
        const next = unitFor(ex, s) === "kg" ? "lb" : "kg";
        ex.unit = next;                       // remembered for next time
        s.units = s.units || {};
        s.units[exId] = next;                 // this session
      }
      else if (btn.classList.contains("add")) sets.push({ w: "", r: "" });
      else if (btn.classList.contains("remove")) sets.pop();
      else if (btn.classList.contains("fill")) s.sets[exId] = sets.map((x, i) => i === 0 ? x : { w: sets[0].w, r: sets[0].r });
      else if (btn.classList.contains("copy")) {
        const prev = previousSets(s, exId);
        if (prev) s.sets[exId] = prev.sets.map(x => ({ w: x.w, r: x.r }));
      } else return;
      persist();
      card.outerHTML = exerciseCard(s, exById(exId), card.querySelector(".lbl").textContent);
      return;
    }
    if (btn.id === "share") shareText(`Workout ${s.workoutId}`, sessionText(s));
    else if (btn.id === "done") location.hash = "#/";
    else if (btn.id === "del") {
      if (!confirm("Delete this session? This can't be undone.")) return;
      state.sessions = state.sessions.filter(x => x.id !== s.id);
      save();
      leaveHook = null;
      location.hash = "#/history";
    }
  });
}

/* ---------- History ---------- */
function viewHistory() {
  setChrome("History");
  const list = sortedSessions().filter(sessionHasData);
  if (!list.length) {
    $view.innerHTML = `<p class="empty">No sessions yet. Pick a workout on the Train tab to start.</p>`;
    return;
  }
  const weeks = [...new Set(list.map(s => s.week))].sort((a, b) => b - a);
  $view.innerHTML = `
    <div class="filters">
      <select id="fw"><option value="">All workouts</option>
        ${program().workouts.map(w => `<option value="${esc(w.id)}">Workout ${esc(w.id)}</option>`).join("")}
      </select>
      <div class="tables">Sheet view:
        ${program().workouts.map(w => `<a href="#/table/${esc(w.id)}">${esc(w.id)}</a>`).join("")}
      </div>
    </div>
    ${weeks.map(wk => `
      <section class="week-group" data-week="${wk}">
        <div class="week-head">
          <h2>Week ${wk}</h2>
          <button class="mini share-week" data-week="${wk}">Share week</button>
        </div>
        ${list.filter(s => s.week === wk).map(s => {
          const sets = Object.values(s.sets).reduce((n, a) => n + a.filter(hasData).length, 0);
          return `
          <a class="card hist" href="#/log/${s.id}" data-w="${esc(s.workoutId)}">
            <span class="letter sm">${esc(s.workoutId)}</span>
            <span class="card-body">
              <span class="card-title">${fmtDate(s.date)}</span>
              <span class="muted small">${sets} sets${s.esd ? " · ESD ✓" : ""}${s.bodyweight ? " · BW " + esc(s.bodyweight) + " " + state.unit : ""}</span>
            </span>
            <span class="chev">›</span>
          </a>`;
        }).join("")}
      </section>`).join("")}
  `;
  $view.querySelectorAll(".share-week").forEach(b =>
    b.addEventListener("click", () => shareText(`Week ${b.dataset.week}`, weekText(b.dataset.week))));
  $view.querySelector("#fw").addEventListener("change", e => {
    const v = e.target.value;
    $view.querySelectorAll(".hist").forEach(a => { a.hidden = v && a.dataset.w !== v; });
    $view.querySelectorAll(".week-group").forEach(g => {
      g.hidden = ![...g.querySelectorAll(".hist")].some(a => !a.hidden);
    });
  });
}

/* ---------- Sheet (table) view – mirrors the PDF layout ---------- */
function viewTable(wid) {
  const prog = program();
  const w = workoutOf(prog, wid);
  if (!w) { location.hash = "#/history"; return; }
  setChrome(`Sheet – Workout ${w.id}`, { back: true });
  const sessions = sortedSessions().filter(s => s.workoutId === wid && sessionHasData(s)).slice(0, 3).reverse();
  const unit = state.unit;
  const cols = [0, 1, 2].map(i => sessions[i]);
  $view.innerHTML = `
    <div class="sheet">
      <div class="sheet-top">
        <div><strong>WORKOUT ${esc(w.id)}</strong> – ${esc(w.title)}</div>
        <div class="small">${esc(prog.name)} · Athlete: ${esc(state.athlete || "–")}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Exercise</th><th>Sets × reps</th>
          ${cols.map((s, i) => `<th>Session ${i + 1}${s ? `<br><span class="small">${fmtDate(s.date)} · wk ${esc(s.week)}${s.bodyweight ? " · " + esc(s.bodyweight) + unit : ""}</span>` : ""}</th>`).join("")}
        </tr></thead>
        <tbody>
          ${w.blocks.map((b, bi) => `
            <tr class="blockrow"><td colspan="6">Block ${bi + 1} – ${esc(b.name)}</td></tr>
            ${b.exercises.map((e, ei) => `<tr>
              <td>${label(bi, ei)}</td><td>${esc(e.name)}</td><td class="nowrap">${esc(e.target)}</td>
              ${cols.map(s => `<td>${s ? esc(fmtSets(s.sets[e.id], unitFor(e, s))) || "–" : ""}</td>`).join("")}
            </tr>`).join("")}`).join("")}
          <tr class="blockrow"><td colspan="3">Post-lift ESD – ${esc(prog.esd || "")}</td>
            ${cols.map(s => `<td>${s ? (s.esd ? "✓" : "–") : ""}</td>`).join("")}</tr>
        </tbody>
      </table>
      <p class="small muted">Shows the 3 most recent Workout ${esc(w.id)} sessions.</p>
    </div>
    <button id="print" class="btn primary block noprint">Print / save as PDF</button>
  `;
  $view.querySelector("#print").onclick = () => window.print();
}

/* ---------- Settings ---------- */
function viewSettings() {
  setChrome("Settings");
  const prog = program();
  $view.innerHTML = `
    <section class="card form">
      <label>Athlete name<input id="athlete" value="${esc(state.athlete)}" placeholder="Your name" autocomplete="name"></label>
      <label>Default weight unit
        <select id="unit"><option value="kg" ${state.unit === "kg" ? "selected" : ""}>kg</option>
        <option value="lb" ${state.unit === "lb" ? "selected" : ""}>lb</option></select></label>
    </section>

    <h2 class="block-h">Program</h2>
    <section class="card form">
      <label>Active program
        <select id="prog">${state.programs.map(p =>
          `<option value="${esc(p.id)}" ${p.id === prog.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      <div class="edit-links">${prog.workouts.map(w =>
        `<a class="btn" href="#/edit/${esc(w.id)}">Edit ${esc(w.id)}</a>`).join("")}</div>
      <button id="newPhase" class="btn">Start a new phase (copy of this one)</button>
    </section>

    <h2 class="block-h">Backup</h2>
    <section class="card form">
      <p class="small muted">Your data is only stored on this phone. Export a backup now and then (for example to iCloud Drive).</p>
      <button id="export" class="btn">Export backup</button>
      <label class="btn filebtn">Import backup<input id="import" type="file" accept="application/json,.json" hidden></label>
    </section>
    <p class="small muted center">${state.sessions.filter(sessionHasData).length} sessions saved</p>
  `;

  $view.querySelector("#athlete").addEventListener("input", e => { state.athlete = e.target.value; save(); });
  $view.querySelector("#unit").addEventListener("change", e => { state.unit = e.target.value; save(); });
  $view.querySelector("#prog").addEventListener("change", e => { state.activeProgramId = e.target.value; save(); viewSettings(); });

  $view.querySelector("#newPhase").onclick = () => {
    const name = prompt("Name for the new phase:", "Phase " + (state.programs.length + 2));
    if (!name) return;
    const copy = JSON.parse(JSON.stringify(prog)); // keeps exercise ids, so "last time" values carry over
    copy.id = uid();
    copy.name = name;
    state.programs.push(copy);
    state.activeProgramId = copy.id;
    save();
    toast("New phase created – edit the workouts below");
    viewSettings();
  };

  $view.querySelector("#export").onclick = exportBackup;
  $view.querySelector("#import").addEventListener("change", importBackup);
}

async function exportBackup() {
  const json = JSON.stringify(state, null, 1);
  const name = `workout-log-backup-${today()}.json`;
  const file = new File([json], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function importBackup(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const s = JSON.parse(reader.result);
      if (!s || !Array.isArray(s.programs) || !Array.isArray(s.sessions)) throw new Error("bad");
      if (!confirm(`Replace the data on this phone with this backup (${s.sessions.length} sessions)?`)) return;
      state = s;
      save();
      toast("Backup restored");
      viewSettings();
    } catch (err) {
      toast("That file isn't a Workout Log backup");
    }
  };
  reader.readAsText(f);
}

/* ---------- Program editor ---------- */
function viewEdit(wid) {
  const prog = program();
  const w = workoutOf(prog, wid);
  if (!w) { location.hash = "#/settings"; return; }
  setChrome(`Edit Workout ${w.id}`, { back: true });

  $view.innerHTML = `
    <section class="card form">
      <label>Title<input id="wtitle" value="${esc(w.title)}"></label>
      <label>Note<textarea id="wnote" rows="2">${esc(w.note)}</textarea></label>
    </section>
    ${w.blocks.map((b, bi) => `
      <section class="card form edit-block" data-b="${bi}">
        <label>Block ${bi + 1} name<input class="bname" value="${esc(b.name)}"></label>
        ${b.exercises.map((e, ei) => `
          <div class="edit-ex" data-e="${ei}">
            <span class="lbl">${label(bi, ei)}</span>
            <input class="ename" value="${esc(e.name)}" placeholder="Exercise" aria-label="Exercise name">
            <input class="etarget" value="${esc(e.target)}" placeholder="3 × 10" aria-label="Sets × reps">
            <select class="eunit" aria-label="Weight unit">
              <option value="" ${!e.unit ? "selected" : ""}>Default (${state.unit})</option>
              <option value="kg" ${e.unit === "kg" ? "selected" : ""}>kg</option>
              <option value="lb" ${e.unit === "lb" ? "selected" : ""}>lb</option>
            </select>
            <button class="mini up" aria-label="Move up">↑</button>
            <button class="mini del" aria-label="Remove">✕</button>
          </div>`).join("")}
        <div class="ex-actions">
          <button class="mini addex">+ Exercise</button>
          ${b.exercises.length === 0 ? '<button class="mini delblock">Remove block</button>' : ""}
        </div>
      </section>`).join("")}
    <button id="addBlock" class="btn block">+ Block</button>
    <p class="small muted">Changes are saved as you type. Past sessions keep their logged numbers.</p>
  `;

  $view.querySelector("#wtitle").addEventListener("input", e => { w.title = e.target.value; save(); });
  $view.querySelector("#wnote").addEventListener("input", e => { w.note = e.target.value; save(); });
  $view.querySelectorAll(".edit-block").forEach(sec => {
    const b = w.blocks[parseInt(sec.dataset.b, 10)];
    sec.querySelector(".bname").addEventListener("input", e => { b.name = e.target.value; save(); });
    sec.querySelectorAll(".edit-ex").forEach(row => {
      const ei = parseInt(row.dataset.e, 10);
      const ex = b.exercises[ei];
      row.querySelector(".ename").addEventListener("input", e => { ex.name = e.target.value; save(); });
      row.querySelector(".etarget").addEventListener("input", e => { ex.target = e.target.value; save(); });
      row.querySelector(".eunit").addEventListener("change", e => {
        if (e.target.value) ex.unit = e.target.value; else delete ex.unit;
        save();
      });
      row.querySelector(".up").onclick = () => {
        if (ei === 0) return;
        [b.exercises[ei - 1], b.exercises[ei]] = [b.exercises[ei], b.exercises[ei - 1]];
        save(); viewEdit(wid);
      };
      row.querySelector(".del").onclick = () => {
        if (!confirm(`Remove "${ex.name || "this exercise"}" from Workout ${w.id}?`)) return;
        b.exercises.splice(ei, 1); save(); viewEdit(wid);
      };
    });
    sec.querySelector(".addex").onclick = () => {
      b.exercises.push({ id: uid(), name: "", target: "3 × 10" });
      save(); viewEdit(wid);
      const inputs = $view.querySelectorAll(`.edit-block[data-b="${sec.dataset.b}"] .ename`);
      inputs[inputs.length - 1].focus();
    };
    const db = sec.querySelector(".delblock");
    if (db) db.onclick = () => { w.blocks.splice(parseInt(sec.dataset.b, 10), 1); save(); viewEdit(wid); };
  });
  $view.querySelector("#addBlock").onclick = () => {
    w.blocks.push({ name: "New block", exercises: [] });
    save(); viewEdit(wid);
  };
}

/* ---------- Boot ---------- */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
// Ask the browser to keep our data even under storage pressure.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
route();
