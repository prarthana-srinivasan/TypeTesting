// ─── WORD BANKS ──────────────────────────────────────────────────────────────
const WORDS = {
  easy: [
    "the","and","for","are","but","not","you","all","any","can","her","was",
    "one","our","out","day","get","has","him","his","how","man","new","now",
    "old","see","two","way","who","did","its","let","put","say","she","too",
    "use","dad","mom","run","sun","top","big","cat","dog","fun","hat","red",
    "sit","yes","no","go","up","in","on","at","by","do","so","if","or","as",
    "we","he","be","me","my","it","is","am","an","of","to","a","I","us","oh"
  ],
  medium: [
    "about","above","after","again","along","among","before","being","below",
    "between","beyond","bring","build","carry","catch","cause","clean","clear",
    "close","color","could","cover","cross","daily","dance","doing","doubt",
    "dream","drive","early","earth","empty","enjoy","enter","every","exist",
    "extra","faith","false","field","final","first","focus","force","found",
    "frame","fresh","front","fully","given","glass","going","grace","grand",
    "great","green","group","grown","guard","guide","heart","heavy","helps",
    "hence","there","think","those","three","threw","throw","times","tired",
    "today","under","until","using","value","voice","water","whole","world",
    "write","wrong","years","young","place","point","right","small","sound"
  ],
  hard: [
    "accomplish","acknowledge","administration","approximately","architecture",
    "circumstances","collaboration","communication","comprehensive","consideration",
    "contemporary","controversial","determination","development","disappointed",
    "documentation","electromagnetic","establishment","extraordinary","fundamental",
    "implementation","infrastructure","intelligence","international","investigation",
    "justify","knowledge","magnificent","management","measurement","mechanism",
    "methodology","millennium","mysterious","nevertheless","optimization",
    "organization","overwhelming","perspective","philosophical","phenomenon",
    "programming","psychological","recommendation","simultaneously","sophisticated",
    "straightforward","subsequently","substantial","technological","transportation",
    "understanding","unfortunately","visualization","vulnerability","extraordinary",
    "accommodation","acknowledgement","authentication","characteristics","collaboration"
  ]
};

const TIME_LIMITS = { easy: 60, medium: 60, hard: 90 };
const WORD_COUNT  = { easy: 40, medium: 50, hard: 60 };
const CIRC        = 2 * Math.PI * 35;

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  difficulty:   "easy",
  words:        [],
  currentWord:  0,
  currentLetter:0,
  started:      false,
  finished:     false,
  timer:        null,
  timeLeft:     60,
  totalTime:    60,
  correctWords: 0,
  errorCount:   0,
  totalTyped:   0,
  wordStatus:   [],
};

// ─── DOM ELEMENTS ─────────────────────────────────────────────────────────────
const wordsEl          = document.getElementById("words-display");
const inputEl          = document.getElementById("type-input");
const wpmEl            = document.getElementById("wpm-stat");
const accEl            = document.getElementById("acc-stat");
const correctEl        = document.getElementById("correct-stat");
const timerNum         = document.getElementById("timer-num");
const timerRing        = document.getElementById("timer-ring");
const resultsEl        = document.getElementById("results");
const historyEl        = document.getElementById("history-list");
const rWpm             = document.getElementById("r-wpm");
const rAcc             = document.getElementById("r-acc");
const rCorrect         = document.getElementById("r-correct");
const rErrors          = document.getElementById("r-errors");
const rBadge           = document.getElementById("result-badge");
const rSub             = document.getElementById("result-sub");
const themeToggleBtn   = document.getElementById("theme-toggle");
const themeIcon        = document.getElementById("theme-icon");
const themeLabel       = document.getElementById("theme-label");

// ─── THEME TOGGLE ─────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem("typerush_theme") || "dark";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("typerush_theme", theme);
  if (theme === "dark") {
    themeIcon.textContent  = "🌙";
    themeLabel.textContent = "Dark";
  } else {
    themeIcon.textContent  = "☀️";
    themeLabel.textContent = "Light";
  }
}

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ─── INIT / RESET ─────────────────────────────────────────────────────────────
function init() {
  clearInterval(state.timer);
  resultsEl.classList.remove("show");

  state = {
    ...state,
    words:         [],
    currentWord:   0,
    currentLetter: 0,
    started:       false,
    finished:      false,
    timer:         null,
    timeLeft:      TIME_LIMITS[state.difficulty],
    totalTime:     TIME_LIMITS[state.difficulty],
    correctWords:  0,
    errorCount:    0,
    totalTyped:    0,
    wordStatus:    [],
  };

  // Generate shuffled word list
  const pool  = [...WORDS[state.difficulty]].sort(() => Math.random() - 0.5);
  const count = WORD_COUNT[state.difficulty];
  for (let i = 0; i < count; i++) {
    state.words.push(pool[i % pool.length]);
  }
  state.wordStatus = state.words.map(w => ({
    letters: w.split("").map(() => ""),
    done: false,
  }));

  renderWords();
  updateStatsDisplay();
  updateTimerDisplay();

  inputEl.value    = "";
  inputEl.disabled = false;
  inputEl.focus();
}

// ─── RENDER WORDS ─────────────────────────────────────────────────────────────
function renderWords() {
  wordsEl.innerHTML = "";

  state.words.forEach((word, wi) => {
    const wSpan   = document.createElement("span");
    wSpan.className = "word";
    wSpan.id        = `w${wi}`;

    word.split("").forEach((ch, li) => {
      const lSpan     = document.createElement("span");
      const status    = state.wordStatus[wi].letters[li];
      lSpan.className = "letter" +
        (status === "correct" ? " correct" : status === "wrong" ? " wrong" : "");
      if (wi === state.currentWord && li === state.currentLetter) {
        lSpan.classList.add("cursor");
      }
      lSpan.textContent = ch;
      wSpan.appendChild(lSpan);
    });

    wordsEl.appendChild(wSpan);
  });

  scrollToCurrent();
}

function scrollToCurrent() {
  const curr = document.getElementById(`w${state.currentWord}`);
  if (curr) curr.scrollIntoView({ block: "center", behavior: "smooth" });
}

// ─── INPUT HANDLER ────────────────────────────────────────────────────────────
inputEl.addEventListener("input", (e) => {
  if (state.finished) return;
  const val = e.target.value;

  // Start timer on first keystroke
  if (!state.started && val.length > 0) {
    state.started = true;
    startTimer();
  }

  // Space = submit current word
  if (val.endsWith(" ")) {
    const typed   = val.trim();
    const correct = state.words[state.currentWord];
    const isOk    = typed === correct;

    // Mark any untyped letters as wrong
    for (let i = typed.length; i < correct.length; i++) {
      state.wordStatus[state.currentWord].letters[i] = "wrong";
    }
    state.wordStatus[state.currentWord].done = true;

    if (isOk) state.correctWords++;
    else      { state.errorCount++; shake(); }

    state.totalTyped++;
    state.currentWord++;
    state.currentLetter = 0;
    inputEl.value = "";

    if (state.currentWord >= state.words.length) { finish(); return; }
    renderWords();
    updateStatsDisplay();
    return;
  }

  // Update letter statuses for current word
  const correct = state.words[state.currentWord];
  for (let i = 0; i < Math.max(val.length, correct.length); i++) {
    if (i < val.length) {
      state.wordStatus[state.currentWord].letters[i] =
        val[i] === correct[i] ? "correct" : "wrong";
    } else {
      state.wordStatus[state.currentWord].letters[i] = "";
    }
  }
  state.currentLetter = val.length;
  renderWords();
});

// Prevent backspace across word boundary
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Backspace" && inputEl.value === "" && state.currentWord > 0) {
    e.preventDefault();
  }
});

// ─── TIMER ────────────────────────────────────────────────────────────────────
function startTimer() {
  timerRing.style.strokeDasharray = CIRC;
  state.timer = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) finish();
  }, 1000);
}

function updateTimerDisplay() {
  timerNum.textContent = state.timeLeft;
  const pct = state.timeLeft / state.totalTime;
  timerRing.style.strokeDashoffset = CIRC * (1 - pct);
  timerRing.style.stroke =
    pct > 0.5 ? "#6366f1" : pct > 0.25 ? "#fbbf24" : "#ef4444";
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function calcWPM() {
  const elapsed = (state.totalTime - state.timeLeft) || 1;
  return Math.round((state.correctWords / elapsed) * 60);
}

function calcAcc() {
  if (state.totalTyped === 0) return 100;
  return Math.round((state.correctWords / state.totalTyped) * 100);
}

function updateStatsDisplay() {
  if (!state.started) return;
  const wpm = calcWPM();
  const acc = calcAcc();
  wpmEl.innerHTML     = `${wpm} <span>wpm</span>`;
  accEl.innerHTML     = `${acc} <span>%</span>`;
  correctEl.textContent = state.correctWords;
}

// ─── SHAKE ANIMATION ──────────────────────────────────────────────────────────
function shake() {
  inputEl.classList.add("shake");
  setTimeout(() => inputEl.classList.remove("shake"), 300);
}

// ─── FINISH ───────────────────────────────────────────────────────────────────
function finish() {
  clearInterval(state.timer);
  state.finished = true;
  inputEl.disabled = true;

  const wpm    = calcWPM();
  const acc    = calcAcc();
  const errors = state.totalTyped - state.correctWords;

  // Populate results panel
  rWpm.textContent     = wpm;
  rAcc.textContent     = acc + "%";
  rCorrect.textContent = state.correctWords;
  rErrors.textContent  = errors;

  // Grade logic
  const gradeData =
    wpm >= 80 ? ["S", "grade-s", "Legendary speed! 🏆"] :
    wpm >= 60 ? ["A", "grade-a", "Excellent typing! 🌟"] :
    wpm >= 40 ? ["B", "grade-b", "Good job! Keep going 💪"] :
    wpm >= 25 ? ["C", "grade-c", "Not bad! Keep practicing 📝"] :
                ["D", "grade-d", "Keep practicing! You'll improve 🎯"];

  rBadge.textContent = `Grade ${gradeData[0]}`;
  rBadge.className   = `result-badge ${gradeData[1]}`;
  rSub.textContent   = gradeData[2];

  resultsEl.classList.add("show");
  resultsEl.scrollIntoView({ behavior: "smooth", block: "center" });

  // Save to history
  saveHistory({
    wpm,
    acc,
    correct: state.correctWords,
    errors,
    diff: state.difficulty,
    time: new Date().toLocaleTimeString(),
  });
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function saveHistory(entry) {
  const h = JSON.parse(localStorage.getItem("typerush_history") || "[]");
  h.unshift(entry);
  if (h.length > 10) h.pop();
  localStorage.setItem("typerush_history", JSON.stringify(h));
  renderHistory();
}

function renderHistory() {
  const h = JSON.parse(localStorage.getItem("typerush_history") || "[]");

  if (!h.length) {
    historyEl.innerHTML = '<div class="history-empty">No tests yet. Complete a test to see your history!</div>';
    return;
  }

  historyEl.innerHTML = h.map((e, i) => `
    <div class="history-row">
      <div class="history-rank">#${i + 1}</div>
      <div class="history-wpm">${e.wpm} <span>wpm</span></div>
      <div class="history-acc">${e.acc}%</div>
      <div class="history-correct">${e.correct} ✓</div>
      <div><span class="diff-tag diff-${e.diff}">${e.diff}</span></div>
      <div class="history-time">${e.time}</div>
    </div>
  `).join("");
}

// ─── CONTROLS ─────────────────────────────────────────────────────────────────
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.difficulty = btn.dataset.diff;
    init();
  });
});

document.getElementById("restart-btn").addEventListener("click", init);
document.getElementById("results-restart-btn").addEventListener("click", init);
document.getElementById("clear-btn").addEventListener("click", () => {
  localStorage.removeItem("typerush_history");
  renderHistory();
});

// ─── KEYBOARD SHORTCUT ────────────────────────────────────────────────────────
// Press Tab to restart
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    init();
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
initTheme();
renderHistory();
init();
