# Dukkanat Ula Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first Arabic web app where a grade 1–3 child runs a neighborhood shop. It diagnoses specific math misconceptions and shows them to parents (report and tonight's mission) and to teachers (class misconception map).

**Architecture:**
- **Engine:** pure ES modules (problems, diagnose, adapt, report, classroom), unit-tested with `node --test`.
- **Audio:** a build-time step generates a fixed problem bank (`data/bank.json`) and MP3 audio for every line via OpenAI TTS, so the runtime is fully static.
- **UI:** vanilla JS screens behind a hash router, with a service worker for offline use.

**Tech Stack:** HTML/CSS/JS (ES modules, no runtime deps, no build), Node 22 (`node --test`, tooling), OpenAI `gpt-audio` with `gpt-4o-mini-tts` fallback (build-time only), Playwright (preinstalled, smoke tests).

**Spec:** `docs/superpowers/specs/2026-10-27-dukkanat-ula-design.md`. Read it: section numbers below refer to it.

## Global Constraints

**Page and layout:**
- `<html lang="ar" dir="rtl">`; all child-facing UI is usable without reading (icons, emoji, numbers, audio).
- Mobile-first portrait; tap targets ≥ 56px; on wide screens the app column is max 480px centered (teacher screen may use full width).
- Must work in Chrome (Android, desktop) and Safari (iOS). Audio starts only after a user tap (Safari autoplay rule).

**Code and data:**
- No runtime libraries, no bundler. Fonts: Google Fonts Cairo with system fallback.
- Every `localStorage` read/write is wrapped in try/catch; the app works in memory without it. Key: `dukkana.v1`.
- The OpenAI key is read only from env `OPENAI_API_KEY` at build time, and is never written to any file.

**Game rules:**
- Currency: JO = قرش with coins 1/5/10; SA = ريال with 1 coin, 5 and 10 notes. Same arithmetic in both.
- Round = 5 problems. Diagnosis uses the first attempt only. No visible timers.

**Ranges** (spec §6):

| Level | Band | Range |
|---|---|---|
| A | g1 | N 3–15 |
| B | g1 | sum ≤ 20 |
| B | g23 | sum ≤ 50 |
| C | g23 easy | P 3–19, Q ∈ {10, 20}, Q > P |
| C | g23 hard | P 11–49, Q ∈ {20, 50}, Q > P |

## Review Focus

1. **Storage blocked** (Safari private mode, or `localStorage` throws): the app plays and reports from memory. Test in Task 7.
2. **Audio fails** (missing MP3, network, autoplay blocked): no exception escapes, the round still completes, and `speechSynthesis` is tried as a fallback. Test in Task 11 (smoke with `audio/**` requests aborted).
3. **Number pad abuse** (submit with empty display, leading zeros, more than 2 digits): submit is disabled when empty, `"0"` followed by a digit replaces the zero, and input is capped at 2 digits. Test in Task 8 (`applyKey`).
4. **Bank exhaustion** (a long session uses up all matching problems, or no problem matches the difficulty): `pickProblem` falls back without returning `undefined`. Test in Task 3.
5. **Double-tap submit:** two fast taps record exactly one attempt. Test in Task 11 (smoke).

---

### Task 1: Project scaffold, seeded RNG, problem generators

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules/`, `.env`, `test-results/`), `js/engine/rng.js`, `js/engine/problems.js`
- Test: `tests/problems.test.js`

**Interfaces:**
- Produces:
  - `makeRng(seed: number) => () => number` returns a value in [0, 1) (mulberry32).
  - `randInt(rng, min, max) => number` (inclusive).
  - `Problem` shape (all levels share `id, level, band, difficulty, answer`):
    - **A:** `{ id:'A-<item>-<n>', level:'A', band:'g1', difficulty, item, n, answer:n }`
    - **B:** `{ id:'B-<band>-<NN>', level:'B', band, difficulty, itemA, a, itemB, b, answer:a+b }`
    - **C:** `{ id:'C-g23-<NN>', level:'C', band:'g23', difficulty, price, paid, answer:paid-price }`
  - `ITEMS = ['juice','biscuit','candy','bread']` (exported from problems.js).
  - `generateLevelA() => Problem[]`: all 52 (n 3..15 × 4 items); difficulty `'hard'` iff n ≥ 10.
  - `generateLevelB(band: 'g1'|'g23', count: number, rng) => Problem[]`:
    - a, b ≥ 2, itemA ≠ itemB, sum ≤ 20 (g1) or ≤ 50 (g23).
    - `'hard'` iff sum > 10 (g1) or > 25 (g23).
    - No duplicate (a, b, itemA, itemB).
  - `generateLevelC(count: number, rng) => Problem[]`: first half easy (grade-2 range), second half hard (grade-3 range), no duplicate (price, paid).

- [ ] **Step 1: Create `package.json`**

  ```json
  {"name":"dukkanat-ula","private":true,"type":"module",
   "scripts":{"test":"node --test tests/","bank":"node tools/build-bank.mjs","audio":"NODE_USE_ENV_PROXY=1 node tools/gen-audio.mjs"}}
  ```

- [ ] **Step 2: Write failing tests**

  ```js
  test('rng is deterministic', () => { const r1 = makeRng(42), r2 = makeRng(42); assert.equal(r1(), r2()); });
  test('level A has 52 problems in range', () => {
    const ps = generateLevelA(); assert.equal(ps.length, 52);
    for (const p of ps) { assert.ok(p.n >= 3 && p.n <= 15); assert.equal(p.answer, p.n);
      assert.equal(p.difficulty, p.n >= 10 ? 'hard' : 'easy'); }
    assert.equal(new Set(ps.map(p => p.id)).size, 52);
  });
  test('level B respects band limits', () => {
    for (const [band, max] of [['g1', 20], ['g23', 50]]) {
      const ps = generateLevelB(band, 40, makeRng(1)); assert.equal(ps.length, 40);
      for (const p of ps) { assert.ok(p.a >= 2 && p.b >= 2 && p.a + p.b <= max); assert.notEqual(p.itemA, p.itemB);
        assert.equal(p.answer, p.a + p.b); assert.equal(p.difficulty, p.answer > max / 2 ? 'hard' : 'easy'); }
    }
  });
  test('level C easy/hard ranges and paid > price', () => {
    const ps = generateLevelC(80, makeRng(2)); assert.equal(ps.length, 80);
    for (const p of ps) { assert.ok(p.paid > p.price); assert.equal(p.answer, p.paid - p.price);
      if (p.difficulty === 'easy') { assert.ok(p.price >= 3 && p.price <= 19 && [10, 20].includes(p.paid)); }
      else { assert.ok(p.price >= 11 && p.price <= 49 && [20, 50].includes(p.paid)); } }
    assert.equal(ps.filter(p => p.difficulty === 'easy').length, 40);
  });
  ```

- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `rng.js` (mulberry32) and `problems.js` per the Interfaces. Generators loop with rejection sampling until `count` unique problems exist.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6:** Commit `feat: seeded rng and problem generators`.

---

### Task 2: Misconception diagnosis

**Files:**
- Create: `js/engine/diagnose.js`
- Test: `tests/diagnose.test.js`

**Interfaces:**
- Consumes: `Problem` (Task 1).
- Produces:
  - `diagnose(problem: Problem, answer: number, ms: number) => { correct: boolean, code: Code, note?: 'slow_counting_all' }`.
  - `CODE_PRIORITY: Code[]` = `['returned_payment','returned_price','added_instead','regroup_smaller_from_larger','partial_add','count_off_by_one','other']`.
  - `smallerFromLarger(paid, price) => number`: digit-wise |onesQ−onesP| + 10×(tensQ−tensP).

**Rules:** first match wins, in the order of spec §7. `regroup_smaller_from_larger` applies only when `paid % 10 < price % 10`.

- [ ] **Step 1: Write failing tests**, one per row of spec §7:
  - C {price:17, paid:50}:
    - `diagnose(p, 33)` → `{correct:true, code:'ok'}`
    - 50 → `returned_payment`
    - 17 → `returned_price`
    - 67 → `added_instead`
    - 47 → `regroup_smaller_from_larger`
    - 32 and 34 → `count_off_by_one`
    - 5 → `other`
  - C {price:17, paid:20}: 17 → `returned_price`. This shows priority beats `regroup`, because `smallerFromLarger(20, 17) === 17`.
  - B {a:3, b:4}:
    - 3 → `partial_add`
    - 8 → `count_off_by_one`
    - 7 with ms 12000 → `{correct:true, code:'ok', note:'slow_counting_all'}`
  - B {a:6, b:7}: answer 13 with ms 12000 → no `note`, because the sum is > 10.
  - A {n:7}: 6 → `count_off_by_one`; 9 → `other`.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement `diagnose.js`.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: misconception diagnosis rules`.

---

### Task 3: Adaptivity and problem picking

**Files:**
- Create: `js/engine/adapt.js`
- Test: `tests/adapt.test.js`

**Interfaces:**
- Consumes: `Problem`, `makeRng`.
- Produces:
  - `type Band = 'g1'|'g23'`.
  - `type AdaptState = { level:'A'|'B'|'C', difficulty:'easy'|'hard', right:number, wrong:number }`.
  - `initialState(band) => AdaptState`: g1 starts at A, g23 at B; difficulty easy; streaks 0.
  - `nextState(state, band, correct: boolean) => AdaptState`:
    - **2 right in a row:** level up if allowed (A→B; B→C only for g23), with difficulty easy. At the top level, set difficulty hard instead.
    - **2 wrong in a row:** if difficulty is hard → easy. Otherwise level down if above the band's first level (difficulty easy). At the first level, stay easy.
    - Streaks reset to 0 after any change; the opposite result resets the other streak.
  - `pickProblem(bank: Problem[], state, band, usedIds: Set<string>, rng) => Problem`:
    - **Candidates:** level match, band match (A is always g1, C is always g23), difficulty match, not used.
    - **Fallbacks:** first drop difficulty, then drop `usedIds`. Never return undefined if the bank has any problem for that level.

- [ ] **Step 1: Write failing tests:**
  - initial g1 → A, initial g23 → B.
  - g1: A + 2 right → B; B + 2 right → B hard (g1 never reaches C).
  - g23: B + 2 right → C easy; C easy + 2 wrong → B easy; B hard + 2 wrong → B easy.
  - right then wrong → no change, and the `right` streak resets.
  - **Review Focus 4:** `pickProblem` with every matching id already in `usedIds` still returns a problem of the requested level. With only `'easy'` problems in the bank and state `'hard'`, it returns an easy problem of that level.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement `adapt.js`.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: adaptive level and problem picking`.

---

### Task 4: Child report summary and parent copy

**Files:**
- Create: `js/engine/report.js`, `js/data/messages.js`
- Test: `tests/report.test.js`

**Interfaces:**
- Consumes: `CODE_PRIORITY` (Task 2).
- Produces:
  - `type Attempt = { ts:number, level:'A'|'B'|'C', problemId:string, answer:number, ms:number, code:Code, correct:boolean, note?:string }`.
  - `SKILL_OF = { A:'count', B:'add', C:'sub' }`.
  - `todayAttempts(attempts, now: Date) => Attempt[]`: same local calendar date.
  - `summarize(attempts) => { total, correct, bySkill: { count:{n,correct}, add:{n,correct}, sub:{n,correct} }, topCode: Code|null, strength: 'count'|'add'|'sub'|null, slow: boolean }`:
    - `topCode`: most frequent non-ok code; ties go to the earlier entry in `CODE_PRIORITY`.
    - `strength`: the skill with the highest accuracy and n ≥ 2.
    - `slow`: any attempt with `note === 'slow_counting_all'`.
  - `MESSAGES: Record<Code|'none'|'slow_counting_all', { explain, tip, mission }>` with `{name}` and `{cur}` placeholders.
  - `fillMessage(text, { name, cur }) => string`.
  - `shareText(summary, name, cur: string) => string` (`cur` = `COUNTRIES[c].cur.few`, used for `{cur}`): a WhatsApp body containing the explain line, the tip and the mission for `topCode` (or `'none'`), filled in.

- [ ] **Step 1: Put the exact copy in `messages.js`.** `regroup_smaller_from_larger` uses the spec §7 text verbatim, with «سارة» replaced by `{name}` and «قرش/قروش» by `{cur}`. The other entries:

  | code | explain | tip | mission |
  |---|---|---|---|
  | `returned_payment` | «{name} رجّعت كل المصاري اللي دفعها الزبون بدل الباقي.» | «احكوا عن معنى "الباقي": الزبون بياخذ أغراضه وبيرجعله اللي زاد.» | «العبوا دكانة: اشتروا منها إشي بـ 7 وادفعوا 10، وخلّوها ترجّعلكم الباقي.» |
  | `returned_price` | «{name} رجّعت سعر الحساب بدل الباقي.» | «عدّوا سوا من السعر لحد المبلغ المدفوع: 7، 8، 9، 10… كم خطوة؟» | «اشتروا منها إشي بـ 6 وادفعوا 10، وعدّوا من 6 لـ 10 على الأصابع.» |
  | `added_instead` | «{name} جمعت السعر والمبلغ المدفوع بدل ما تطرح.» | «الباقي دايماً أصغر من المبلغ اللي دفعناه.» | «اسألوها قبل الجواب: الباقي أكبر ولا أصغر من اللي دفعناه؟ وبعدين احسبوه سوا.» |
  | `partial_add` | «{name} عدّت مجموعة وحدة بس ونسيت الثانية.» | «حطوا المجموعتين جنب بعض وعدّوهم مع بعض.» | «حطوا 3 ملاعق و4 شوك على الطاولة، واسألوها: كم صاروا كلهم؟» |
  | `count_off_by_one` | «{name} قريبة كثير! بس أحياناً بتعدّ إشي مرتين أو بتنسى واحد.» | «خلّوها تأشّر على كل غرض وهي بتعدّه، وتزيحه على جنب.» | «عدّوا 12 حبة فاصوليا سوا، وكل حبة بتنعدّ بتنحط بصحن.» |
  | `other` | «{name} بتحاول وبعدها بتتعلّم، والأرقام لسا جديدة عليها.» | «العبوا بأرقام صغيرة لحد 10 أول.» | «عدّوا الدرج وانتو طالعين: 1، 2، 3…» |
  | `slow_counting_all` | «ممكن {name} بتعدّ من الأول كل مرة بدل ما تكمّل من الرقم الأكبر.» | «علّموها: "معي 5 بإيدي، وبكمّل: 6، 7، 8".» | «حطوا 5 حبات بإيدها وزيدوا 3، وخلّوها تكمّل العدّ من 5.» |
  | `none` | «{name} ما غلطت اليوم! 🌟» | «جاهزة للمستوى الجاي.» | «خلّوها تحسبلكم باقي مشترى حقيقي بالدكانة بكرا.» |

- [ ] **Step 2: Write failing tests:**
  - 3× regroup + 1× count_off_by_one + 2× ok → `topCode === 'regroup_smaller_from_larger'`, and `bySkill.sub.n` matches.
  - A tie of 1 `partial_add` and 1 `count_off_by_one` → `'partial_add'`.
  - No attempts → `{ total:0, topCode:null, strength:null }`.
  - `todayAttempts` drops an attempt from yesterday.
  - `shareText` with name «سارة» contains «سارة» and the regroup mission text, and contains no literal `{`.
- [ ] **Step 3:** Run `npm test` → FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6:** Commit `feat: child report summary and parent copy`.

---

### Task 5: Classroom view and demo data

**Files:**
- Create: `js/engine/classroom.js`, `js/data/class-demo.js`, `js/data/demo.js`
- Test: `tests/classroom.test.js`

**Interfaces:**
- Consumes: `summarize`, `SKILL_OF`, `Attempt` (Task 4).
- Produces:
  - `skillColor({n, correct}) => 'green'|'yellow'|'red'|'gray'`: gray if n < 3; else ≥ 0.8 green, ≥ 0.5 yellow, otherwise red.
  - `classroomView(students: {id, name, attempts}[]) => { rows: {id, name, colors:{count,add,sub}}[], groups: {code, studentIds:string[]}[] }`:
    - A group holds the students with ≥ 2 attempts of that code (code ≠ ok).
    - Groups are sorted by size, descending.
  - `makeClassDemo(now: Date) => {id, name, attempts}[]`:
    - 24 students with Arabic first names. Each student has 6 attempts per skill they're tested on.
    - Hand-built, not random: exactly 6 students with ≥ 2 `regroup_smaller_from_larger`, 4 with ≥ 2 `count_off_by_one`, 3 with ≥ 2 `partial_add`, and the rest all ok.
  - `makeSaraDemo(now: Date) => Attempt[]`: today; grade 2; 4 count ok, 3 add ok + 1 `partial_add`, 2 sub ok + 3 `regroup_smaller_from_larger`.

- [ ] **Step 1: Write failing tests:**
  - Color thresholds:
    - {n:2, correct:2} → gray
    - {5,4} → green
    - {4,2} → yellow
    - {5,2} → red
  - `classroomView(makeClassDemo(now))`:
    - 24 rows.
    - groups[0] is `{code:'regroup_smaller_from_larger'}` with 6 ids.
    - The `count_off_by_one` group has 4 ids and the `partial_add` group has 3.
  - `summarize(makeSaraDemo(now)).topCode === 'regroup_smaller_from_larger'`.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: classroom view and demo data`.

---

### Task 6: Content catalog, problem bank, OpenAI audio

**Files:**
- Create: `js/data/catalog.js`, `js/data/countries.js`, `tools/build-bank.mjs`, `tools/gen-audio.mjs`, `data/bank.json` (generated), `audio/jo/*.mp3`, `audio/sa/*.mp3` (generated)
- Test: `tests/catalog.test.js`, `tests/bank.test.js`

**Interfaces:**
- Consumes: generators (Task 1).
- Produces:
  - `ITEM_INFO: Record<item, { emoji, forms:{one,two,few,many} }>`:

    | item | emoji | one | two | few | many |
    |---|---|---|---|---|---|
    | juice | 🧃 | علبة عصير | علبتين عصير | علب عصير | علبة عصير |
    | biscuit | 🍪 | باكيت بسكوت | باكيتين بسكوت | باكيتات بسكوت | باكيت بسكوت |
    | candy | 🍬 | حبة حلو | حبتين حلو | حبات حلو | حبة حلو |
    | bread | 🍞 | رغيف خبز | رغيفين خبز | أرغفة خبز | رغيف خبز |

  - `countPhrase(qty, forms) => string`:
    - qty 1 → `forms.one`
    - qty 2 → `forms.two` (no digit)
    - 3–10 → `"<qty> " + forms.few`
    - ≥ 11 → `"<qty> " + forms.many`
  - `COUNTRIES`:
    - `jo`: `{ flag:'🇯🇴', cur:{one:'قرش',two:'قرشين',few:'قروش',many:'قرش'}, money:[{v:10,kind:'coin'},{v:5,kind:'coin'},{v:1,kind:'coin'}], dialect:'Jordanian Levantine Arabic' }`
    - `sa`: `{ flag:'🇸🇦', cur:{one:'ريال',two:'ريالين',few:'ريالات',many:'ريال'}, money:[{v:10,kind:'note'},{v:5,kind:'note'},{v:1,kind:'coin'}], dialect:'Saudi Najdi Arabic' }`
  - `VOICES = { f:'marin', m:'cedar' }` in countries.js. These are defaults; Step 5 lets the user replace them.
  - `LINES: {id, text, voice}[]`, fixed lines in Jordanian spelling (the Saudi audio uses the same text with the Saudi dialect instruction). Ids and text:
    - `welcome` «أهلا وسهلا بدكانتك!»
    - `pick` «اختار شخصيتك»
    - `praise1` «برافو عليك!»
    - `praise2` «ممتاز!»
    - `praise3` «يا سلام عليك!»
    - `tryAgain` «ولا يهمك، يلا نعدّ سوا»
    - `thanks` «يسلمو إيديك!»
    - `roundEnd` «خلصت الجولة! شوف كم نجمة جمعت»
    - `shelfDone` «اكبس خلصت لما تخلّص»
    - `giveChange` «رجّعلي الباقي»
    - `num-1`…`num-20` with text = the digit
  - `promptText(problem, countryKey) => string`:
    - **A:** «حط {countPhrase(n)} عالرف»
    - **B:** «بدّي {countPhrase(a, itemA)} و{countPhrase(b, itemB)}. كم صاروا؟»
    - **C:** «الحساب {countPhrase(price, cur)}، وهاي {countPhrase(paid, cur)}. كم الباقي؟»
  - `bank.json` = `{ problems: (Problem & { voice:'f'|'m' })[], lines: {id, voice, text:{jo, sa}}[] }`. It includes problem prompts as lines with id = problem.id. Problem voice: A is always `'f'`; B and C alternate by index.

- [ ] **Step 1: Write failing tests:**
  - `countPhrase`: 1/2/7/12 for juice, giving «علبة عصير», «علبتين عصير», «7 علب عصير», «12 علبة عصير».
  - `promptText` for C {price:17, paid:20}:
    - jo → «الحساب 17 قرش، وهاي 20 قرش. كم الباقي؟»
    - sa → «الحساب 17 ريال، وهاي 20 ريال. كم الباقي؟»
  - `bank.test.js` (runs after generation):
    - 212 problems: 52 A, 40 B-g1, 40 B-g23, 80 C.
    - Unique ids.
    - Every line id has `audio/jo/<id>.mp3` and `audio/sa/<id>.mp3` on disk with size > 1000 bytes.
- [ ] **Step 2:** Run the catalog test → FAIL. Implement `catalog.js` and `countries.js` → PASS.
- [ ] **Step 3: Implement `tools/build-bank.mjs`.** It uses seeds A: none, B-g1: 11, B-g23: 23, C: 37, and writes `data/bank.json`.
- [ ] **Step 4: Implement `tools/gen-audio.mjs`.**
  - For each line × country, skip the file if it exists. Otherwise call `POST https://api.openai.com/v1/chat/completions` with:
    - `model:'gpt-audio'`, `modalities:['text','audio']`, `audio:{ voice: VOICES[line.voice], format:'mp3' }`.
    - System message: `"You are a voice actor. Say the user's sentence exactly as written, word for word, nothing before or after. Speak in warm, friendly <dialect> to a 6-year-old child. Slightly slow, clear, cheerful. Read numbers in Arabic."`
    - User message: the line text.
  - Decode `choices[0].message.audio.data` (base64) to the MP3 file.
  - **Fidelity check:** normalize `message.audio.transcript` and the input text (strip diacritics, punctuation and digits). If the remaining word sets differ by more than 1 word, retry (max 3). After 3 failures, fall back to `POST /v1/audio/speech` with `{ model:'gpt-4o-mini-tts', voice, input, response_format:'mp3', instructions }` (same instruction text), and log the id.
  - Concurrency 4; retry 3× on 429/5xx; exit non-zero if `OPENAI_API_KEY` is missing.
  - Flag `--sample` writes only `welcome` and `B-g1-00` for every voice in `['marin','cedar','coral','shimmer','sage','ash','ballad','verse']` to `samples/` (gitignored) for the user to pick.
- [ ] **Step 5: Voice pick.** Run `npm run audio -- --sample`, send the samples to the user, and set `VOICES` to the user's choice. Then run `npm run bank && npm run audio`.
- [ ] **Step 6:** Run `npm test` → PASS (bank test included).
- [ ] **Step 7:** Commit `feat: content catalog, problem bank and generated audio`.

---

### Task 7: App shell, store, audio player, start and map screens

**Files:**
- Create: `index.html`, `css/style.css`, `js/main.js`, `js/store.js`, `js/audio.js`, `js/screens/start.js`, `js/screens/map.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: `bank.json`, `COUNTRIES`, `LINES`.
- Produces:
  - `store.js`:
    - `load() => AppState`, `save(state)`, `addAttempt(state, attempt) => AppState`, `resetChild(state)`.
    - `AppState = { child:{avatar:string, band:'g1'|'g23'}|null, country:'jo'|'sa', attempts:Attempt[] }`.
    - Takes `storage` as an optional parameter (default `globalThis.localStorage`) for tests.
  - `audio.js`:
    - `createAudio({ getCountry, textOf:(id)=>string })` returns `{ unlock(), play(id) => Promise<void>, stop() }`.
    - `play` loads `audio/<country>/<id>.mp3`. On any error it falls back to `speechSynthesis` (lang `ar-JO` or `ar-SA`, else `ar`) and resolves either way, never rejecting.
  - `main.js`:
    - Hash router: `#/start`, `#/map`, `#/shop`, `#/report`, `#/report/<studentId>`, `#/teacher`.
    - `ctx = { state, setState(fn), bank, audio, go(route) }`; each screen exports `render(root: HTMLElement, ctx)`.
  - **Start screen:**
    - 4 avatar buttons (🧒 👧 👦 👩‍🦱) and 2 band buttons with big «1» and «2 – 3».
    - Corner buttons «للأهل» (`#/report`), «للمعلم» (`#/teacher`), and the flag (toggles `jo`/`sa`).
    - First tap calls `audio.unlock()` and plays `welcome`.
  - **Map screen:** the shop 🏪 (active, pulse animation) and bakery 🥖, market 🍅, bus 🚌 locked with 🔒.

- [ ] **Step 1: Write failing tests (Review Focus 1):**
  - `load(throwingStorage)` returns the default state `{child:null, country:'jo', attempts:[]}`.
  - `save` with throwing storage does not throw.
  - With a fake Map-backed storage, a save then load round-trips attempts.
- [ ] **Step 2:** Run `npm test` → FAIL. Implement `store.js` → PASS.
- [ ] **Step 3: Implement the HTML/CSS shell.**
  - Cairo font; color tokens on `:root`.
  - `.app { max-width: 480px; margin: 0 auto }`; buttons `min-height: 56px`.
  - Also implement `audio.js`, `main.js` and both screens.
- [ ] **Step 4: Verify.** Run `python3 -m http.server 8080`, open `/#/start` with Playwright at 390×844, and take a screenshot to `test-results/start.png`. Expected: the screen renders RTL with no console errors.
- [ ] **Step 5:** Commit `feat: app shell, store, audio, start and map screens`.

---

### Task 8: Shop screen (levels A, B, C)

**Files:**
- Create: `js/screens/shop.js`, `js/ui/pad.js`
- Test: `tests/pad.test.js`

**Interfaces:**
- Consumes:
  - `initialState`, `nextState`, `pickProblem` (Task 3)
  - `diagnose` (Task 2)
  - `promptText`, `ITEM_INFO`, `COUNTRIES` (Task 6)
  - `addAttempt` (Task 7)
- Produces:
  - `applyKey(display: string, key: '0'..'9'|'del') => string`: max 2 digits; `'0'` then a digit replaces the zero; `'del'` removes the last char.
  - `canSubmit(display) => boolean`: non-empty.

**Round flow:**
1. Pick a problem and play its audio. A 🔊 button replays it.
2. Record `ms` from render to the first submit, and disable submit immediately on tap (Review Focus 5).
3. `diagnose`, then `addAttempt` with `{ts, level, problemId, answer, ms, code, correct, note}`, then `nextState`.
4. **Correct:** play a random praise line plus a coin animation (CSS), then the next problem.
5. **Wrong:** play `tryAgain` and run the hint (below). One retry, not diagnosed. Then the next problem.
6. After 5 problems, show the round-end panel: ⭐ × correct-first-attempt count, `roundEnd` audio, and buttons «كمان جولة» / «خلصت» (`#/map`).

**Level UIs:**
- **A:** a big item button adds to a shelf row; tapping a shelf item removes it. «خلصت ✓». Answer = shelf count.
- **B:** two emoji groups and the number pad (3×4 grid; ✓ disabled while `!canSubmit`).
- **C:** a price tag and the customer's paid money (coins or notes from `COUNTRIES`). Money buttons add to a tray; tapping a tray piece removes it. «تفضّل ✓». Answer = tray sum.

**Hints:**
- **A/C:** items highlight one by one with `num-k` audio (k ≤ 20).
- **B:** the larger group gets a boxed label with its count, then the smaller group's items highlight one by one with `num-(larger+i)` audio (count-on).

- [ ] **Step 1: Write failing tests:**
  - `applyKey('', '0') === '0'`
  - `applyKey('0', '7') === '7'`
  - `applyKey('12', '3') === '12'`
  - `applyKey('12', 'del') === '1'`
  - `canSubmit('') === false`
- [ ] **Step 2:** Run `npm test` → FAIL. Implement `pad.js` → PASS.
- [ ] **Step 3:** Implement `shop.js` per the round flow, level UIs and hints above.
- [ ] **Step 4: Verify.** A Playwright script plays one A problem and one C problem by clicking, with screenshots `test-results/shop-a.png` and `shop-c.png`. Expected: attempts appear in `localStorage['dukkana.v1']` and there are no console errors.
- [ ] **Step 5:** Commit `feat: shop screen with three levels and hints`.

---

### Task 9: Parent report screen

**Files:**
- Create: `js/screens/report.js`

**Interfaces:**
- Consumes:
  - `todayAttempts`, `summarize`, `MESSAGES`, `fillMessage`, `shareText` (Task 4)
  - `makeSaraDemo` (Task 5)
- Produces: `renderReport(root, { name, attempts, country })`, reused by the teacher screen; `render(root, ctx)` for `#/report`.

**Layout:**
- **Header:** child avatar + «تقرير اليوم».
- **Stats:** stars count and a 3-skill bar row (عدّ / جمع / طرح with n and %).
- **Cards:**
  - «وين أبدع» → `strength`
  - «انتبهوا لـ» → `topCode` explain + tip
  - «مهمة الليلة» → mission
- **WhatsApp button:** `https://wa.me/?text=` + `encodeURIComponent(shareText(...))`.
- **«طفل تجريبي» button:** replaces today's attempts with `makeSaraDemo(new Date())` and sets the name «سارة». The default child's name is «بطلنا».
- **Empty state** (`total === 0`): «لسا ما لعب اليوم» with a button to `#/map`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify.** Playwright opens `#/report`, clicks «طفل تجريبي», and takes screenshot `test-results/report.png`. Expected: the text contains «50 − 17» and the WhatsApp link href starts with `https://wa.me/?text=`.
- [ ] **Step 3:** Commit `feat: parent report with mission and WhatsApp share`.

---

### Task 10: Teacher screen

**Files:**
- Create: `js/screens/teacher.js`

**Interfaces:**
- Consumes: `classroomView`, `makeClassDemo` (Task 5); `renderReport` (Task 9).

**Layout:**
- Full-width grid of 24 rows × 3 skill columns, with colored dots and a legend.
- Below it, the group cards, e.g. «6 طلاب بحاجة درس الاستلاف» with names. Map each code to a lesson title:

  | code | Title |
  |---|---|
  | `regroup_smaller_from_larger` | درس الاستلاف |
  | `count_off_by_one` | العدّ بالتأشير |
  | `partial_add` | جمع مجموعتين |
  | `returned_payment` / `returned_price` / `added_instead` | معنى الباقي |
  | `other` | مراجعة الأرقام |

- Clicking a row → `#/report/<id>` renders that student via `renderReport`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify.** Playwright at 1366×768 takes screenshot `test-results/teacher.png`. Expected: 24 rows, and the first group card mentions 6 students.
- [ ] **Step 3:** Commit `feat: teacher class misconception map`.

---

### Task 11: PWA offline, smoke suite, deploy

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png` (a 🏪 emoji on a brand-color background, rendered with Playwright), `tools/smoke.cjs`, `tools/qr.cjs` or `qr.png`

**Interfaces:**
- **`sw.js`:**
  - Cache `dukkana-v1`.
  - Precache the app shell (all html/css/js/json files listed explicitly) and `audio/{jo,sa}/` fixed `LINES`.
  - Cache-first for same-origin GET, with runtime caching for other `audio/` files.
  - Register in `main.js`, only when `'serviceWorker' in navigator`.
- **`tools/smoke.cjs`** (Playwright, against `http://localhost:8080`), at 390×844:
  1. Full flow (start → map → shop, 5 problems answered via UI → round end → report) with zero console errors.
  2. The same flow with `page.route('**/audio/**', r => r.abort())`, which must still complete (Review Focus 2).
  3. Double-click on submit records exactly one attempt (Review Focus 5).
  4. After the first load, `context.setOffline(true)` and a reload still render the start screen.
  5. A Safari check with `webkit`, if available in the Playwright install; skip otherwise.

- [ ] **Step 1:** Write `tools/smoke.cjs` and run it → FAIL on the offline check.
- [ ] **Step 2:** Implement the manifest, `sw.js` and icons.
- [ ] **Step 3:** Run `node tools/smoke.cjs` → all checks PASS. Run `npm test` → PASS.
- [ ] **Step 4: Deploy.**
  - Ask the user to make the repo public and enable GitHub Pages (Settings → Pages → branch `main` or the working branch, root).
  - If they can't, publish via Artifact. That has a 255-files-per-publish limit, so split the audio across several publishes to the same URL.
- [ ] **Step 5:** Generate `qr.png` for the final URL and send it to the user.
- [ ] **Step 6:** Commit `feat: offline PWA, smoke suite, deploy`.
