(function () {
  const E = window.ENGINE, D = window.DEMO_DATA;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCED ? 0 : ms));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (x) => Math.round(x * 100) + '%';
  const money = (x) => '$' + E.usd(x);
  const sum = (a) => a.reduce((s, x) => s + (+x || 0), 0);
  const clock = (d) => d.toLocaleTimeString('en-GB');

  const ROSTER = {};
  D.RECORDS.forEach((r) => { ROSTER[r.emp] = r.role; });
  const PEOPLE = Object.keys(ROSTER).length, N = D.RECORDS.length;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const STORIES = [
    { t: 'A normal week', d: 'Everything matches. See what the system does when there is nothing to find.', emp: 'Amara Okafor', project: 'Harbor', days: [8, 8, 8, 8, 8, 0, 0], note: '' },
    { t: 'Overtime on a verbal OK', d: 'Mateo stayed late. His manager said it was fine.', emp: 'Mateo Alvarez', project: 'Kestrel', days: [9, 9, 9, 9, 8, 0, 0], note: 'Dock leveller install ran long. Marcus said it was fine to stay.' },
    { t: 'Overtime with written approval', d: 'Grace worked 46 hours and quotes an approval number.', emp: 'Grace Kim', project: 'Tidal', days: [9, 10, 10, 9, 8, 0, 0], note: 'Stayed late Wed and Thu for the clarifier pump failure. Dana Whitfield signed off, ref OT-2291.' },
    { t: 'A borrowed approval number', d: 'Rafael quotes an overtime reference. Is it really his?', emp: 'Rafael Costa', project: 'Harbor', days: [8, 8, 8, 8, 8, 2, 0], note: 'Saturday commissioning, pre-approved, ref OT-2304.' },
    { t: 'The client approved less', d: 'Jonas logged 40 hours. The client signed off 32.', emp: 'Jonas Weber', project: 'Tidal', days: [8, 8, 8, 8, 8, 0, 0], approved: 32, billed: 32, note: 'Friday valve replacement, client rep was off site so no sign-off yet.' },
    { t: 'Travel days', d: 'Diego was billed for fewer hours than were approved. Mistake or policy?', emp: 'Diego Santos', project: 'Tidal', days: [8, 8, 8, 8, 8, 0, 0], billed: 36, note: 'Includes 8h travel to the Tidal site, Mon and Fri.' },
    { t: 'Hours on the wrong project', d: 'Every number agrees. The problem is hiding in the note.', emp: 'Samir Khan', project: 'Tidal', days: [8, 8, 8, 8, 8, 0, 0], note: 'Includes 3h for Kestrel snag list, logged here because the Kestrel code was locked.' },
  ];

  const S = { step: 0, T: null, A: null, played: {}, stamp: {}, seen: 0, fi: 0, decision: null, comment: '', run: 0, week: null, caseId: 'invoices', liveAvailable: false, useLive: false, busy: false };

  /* ================= the timesheet and its analysis ================= */
  const blank = () => ({ emp: 'Amara Okafor', project: 'Harbor', days: [0, 0, 0, 0, 0, 0, 0], note: '', approved: null, none: false, billed: null, rate: null });

  function record() {
    const T = S.T, role = ROSTER[T.emp], card = D.RATE_CARD[role], sub = sum(T.days);
    return { id: 'TS-2001', emp: T.emp, role, project: T.project, projectName: D.PROJECTS[T.project], submitted: sub, approved: T.none ? null : T.approved ?? sub, billed: T.billed ?? sub, rate: T.rate ?? card, cardRate: card, note: T.note.trim() };
  }

  function analysis() {
    if (!S.A) {
      const rec = record(), ins = E.inspect(rec), findings = ins.candidates.map(E.review);
      const exceptions = findings.filter((f) => f.verdict === 'exception');
      S.A = { rec, checks: ins.checks, findings, exceptions, total: exceptions.reduce((s, f) => s + f.impact, 0) };
    }
    return S.A;
  }

  // Any edit to the timesheet throws away everything computed after it.
  function dirty() { S.A = null; S.played = {}; S.fi = 0; S.decision = null; S.comment = ''; S.stamp = { 1: S.stamp[1] }; S.seen = Math.min(S.seen, 2); }

  /* ================= steps ================= */
  const STAGES = { 1: 'Design & prototype', 2: 'Build the agent', 3: 'Agentic workflow', 4: 'Platform' };

  const STEPS = [
    /* 0: home */ {
      body: () => `
        <div class="hero">
          <p class="crumbs"><span class="stage">Agentic systems case study</span></p>
          <h1>Follow one timesheet from the field to the <em>finance report.</em></h1>
          <p class="plain">Meridian Field Services has ${D.HEADCOUNT} people and three systems that never quite agree, so someone spends 40 hours a month checking them by hand. Pick a story, play the employee, and watch each step of the fix.</p>
        </div>
        <p class="section-label">Pick a story to follow</p>
        <div class="stories">
          ${STORIES.map((s, i) => `<button class="story" data-story="${i}"><b>${s.t}</b><span>${s.d}</span></button>`).join('')}
          <button class="story blank" data-story="-1"><b>Start from a blank timesheet</b><span>Fill in your own and try to break it.</span></button>
        </div>`,
    },

    /* 1 */ {
      stage: 1, name: 'Fill in a timesheet', tech: 'A form · no AI', role: 'You are the employee',
      title: 'Fill in this week’s timesheet.',
      plain: 'This is where it starts: a person in the field types in their hours and, sometimes, a note. Change anything you like.',
      body: () => {
        const T = S.T;
        return `<div class="card">
          <div class="cols">
            <label class="field"><span>Employee</span><select id="f-emp">${Object.keys(ROSTER).map((n) => `<option ${n === T.emp ? 'selected' : ''}>${n}</option>`).join('')}</select><p class="who" id="f-who"></p></label>
            <label class="field"><span>Project</span><select id="f-proj">${Object.entries(D.PROJECTS).map(([k, v]) => `<option value="${k}" ${k === T.project ? 'selected' : ''}>${v}</option>`).join('')}</select><p class="who">${D.WEEK}</p></label>
          </div>
          <div class="week">
            ${DAYS.map((d, i) => `<label class="${i > 4 ? 'wkend' : ''}">${d}<input type="number" min="0" max="16" step="0.25" data-day="${i}" value="${T.days[i]}"></label>`).join('')}
            <div class="total" id="f-total"></div>
          </div>
          <label class="field"><span>Note for the back office (optional)</span><textarea id="f-note" placeholder="Anything unusual about this week?">${esc(T.note)}</textarea></label>
        </div>`;
      },
      mount: () => {
        const T = S.T;
        const paint = () => {
          const t = sum(T.days);
          $('#f-who').textContent = `${ROSTER[T.emp]} · $${D.RATE_CARD[ROSTER[T.emp]]}/h on the rate card`;
          $('#f-total').className = 'total' + (t > 40 ? ' over' : '');
          $('#f-total').innerHTML = `<label>Total</label><b>${E.h(t)}h</b>`;
        };
        paint();
        $('#f-emp').onchange = (e) => { T.emp = e.target.value; T.rate = null; dirty(); paint(); };
        $('#f-proj').onchange = (e) => { T.project = e.target.value; dirty(); };
        $('#f-note').oninput = (e) => { T.note = e.target.value; dirty(); };
        $$('[data-day]').forEach((el) => { el.oninput = () => { T.days[+el.dataset.day] = Math.max(0, +el.value || 0); dirty(); paint(); }; });
      },
      next: () => ({ label: 'Submit timesheet', act: () => { if (!sum(S.T.days)) return toast('Add some hours first.'); go(2); } }),
    },

    /* 2 */ {
      stage: 1, name: 'Compare three systems', tech: 'Data join · no AI', role: 'You are the back office',
      title: 'Three systems each hold a version of this week.',
      plain: 'The employee’s timesheet, the hours the client signed off, and the hours finance billed. When they disagree, someone has to work out why. Change a number to create a disagreement.',
      body: () => `<div class="sys">
          <div class="card"><h2>Timekeeping</h2><p class="row">what the employee submitted</p><div class="big" id="s-sub"></div><p class="status">The starting point</p></div>
          <div class="card" id="c-appr"><h2>Client approval</h2><p class="row">what the client signed off</p><div class="row"><input type="number" id="s-appr" min="0" max="112" step="0.25"> hours</div><label class="check"><input type="checkbox" id="s-none"> Not approved yet</label><p class="status"></p></div>
          <div class="card" id="c-bill"><h2>ERP billing</h2><p class="row">what finance invoiced</p><div class="row"><input type="number" id="s-bill" min="0" max="112" step="0.25"> hours</div><div class="row" style="margin-top:8px"><input type="number" id="s-rate" min="0" max="400" step="1"> $ per hour</div><p class="status"></p></div>
        </div>
        <p class="hint">Nothing is being judged yet. This step only lines the three records up side by side.</p>`,
      mount: () => {
        const T = S.T;
        const paint = () => {
          const r = record();
          $('#s-sub').innerHTML = `${E.h(r.submitted)}<small> hours</small>`;
          $('#s-none').checked = T.none; $('#s-appr').disabled = T.none;
          if (document.activeElement !== $('#s-appr')) $('#s-appr').value = T.none ? '' : r.approved;
          if (document.activeElement !== $('#s-bill')) $('#s-bill').value = r.billed;
          if (document.activeElement !== $('#s-rate')) $('#s-rate').value = r.rate;
          const aDiff = T.none || r.approved !== r.submitted;
          $('#c-appr').classList.toggle('diff', aDiff);
          $('#c-appr .status').textContent = T.none ? 'No sign-off on file' : aDiff ? `Differs from the timesheet by ${E.h(Math.abs(r.approved - r.submitted))}h` : '✓ Matches the timesheet';
          const base = T.none ? r.submitted : r.approved, bDiff = r.billed !== base, rDiff = r.rate !== r.cardRate;
          $('#c-bill').classList.toggle('diff', bDiff || rDiff);
          $('#c-bill .status').textContent = bDiff ? `Differs from ${T.none ? 'the timesheet' : 'the approval'} by ${E.h(Math.abs(r.billed - base))}h` : rDiff ? `Rate card says $${r.cardRate}/h` : '✓ Matches';
        };
        paint();
        $('#s-appr').oninput = (e) => { T.approved = e.target.value === '' ? null : +e.target.value; dirty(); paint(); };
        $('#s-bill').oninput = (e) => { T.billed = e.target.value === '' ? null : +e.target.value; dirty(); paint(); };
        $('#s-rate').oninput = (e) => { T.rate = e.target.value === '' ? null : +e.target.value; dirty(); paint(); };
        $('#s-none').onchange = (e) => { T.none = e.target.checked; dirty(); paint(); };
      },
      next: () => ({ label: 'Run the checks', act: () => go(3) }),
    },

    /* 3 */ {
      stage: 1, name: 'Run the checks', tech: 'Rules · no AI',
      title: 'Run the checks a spreadsheet could do.',
      plain: 'Six yes-or-no questions, answered by ordinary code. This is the Stage 1 prototype: cheap, fast, and it never makes things up.',
      body: () => `<div class="card"><ol class="checks" id="checks">${analysis().checks.map((c) => `<li class="wait"><span class="ic"></span><b>${c.label}</b><span>${c.detail}</span></li>`).join('')}</ol></div><div id="checks-out"></div>`,
      mount: async () => {
        const run = ++S.run, A = analysis(), li = $$('#checks li');
        for (let i = 0; i < li.length; i++) {
          const c = A.checks[i];
          if (!S.played[3]) { li[i].className = 'run'; await sleep(330); if (run !== S.run) return; }
          li[i].className = c.pass === null ? 'skip' : c.pass ? 'pass' : 'fail';
          $('.ic', li[i]).textContent = c.pass === null ? '–' : c.pass ? '✓' : '!';
        }
        S.played[3] = true;
        const failed = A.checks.filter((c) => c.pass === false);
        $('#checks-out').innerHTML = failed.length
          ? `<p class="banner warn fade-in"><b>${failed.length} ${failed.length > 1 ? 'checks' : 'check'} failed.</b> The rules can see that something is off. They cannot tell whether it is allowed, because that depends on the note and the policy. That is the one place a language model earns its keep.</p>`
          : `<p class="banner fade-in"><b>All checks passed.</b> This timesheet goes straight through and no AI is used at all. Most of the week looks like this, which is why the model is only called for the exceptions.</p>`;
        renderSide(); renderNav();
      },
      next: () => !S.played[3] ? { label: 'Checking…', disabled: true }
        : analysis().findings.length ? { label: 'Look up the policy', act: () => go(4) } : { label: 'Go to the report', act: () => go(8) },
    },

    /* 4 */ {
      stage: 2, name: 'Look up the policy', tech: 'Retrieval (RAG)',
      title: 'The agent looks up the rule before it says anything.',
      plain: 'Instead of answering from memory, it searches the company’s policy handbook and pulls the three most relevant clauses. Type your own question to try the search.',
      body: () => { const f = cur(); return f ? `${tabs()}
        <div class="card">
          <h2>The agent’s question</h2>
          <div class="ask"><input type="text" id="q" value="${esc(f.query)}"></div>
          <div class="shelf" id="shelf">${D.POLICY.map((p) => `<span data-id="${p.id}" title="${esc(p.title)}">${p.id}</span>`).join('')}</div>
          <p class="hint">${D.POLICY_NAME} · ${D.POLICY.length} clauses · keyword search (BM25)</p>
        </div>
        <div class="card"><h2>Most relevant clauses</h2><div id="hits"></div></div>` : nothing(); },
      mount: () => {
        if (!cur()) return;
        const paint = () => {
          const hits = E.retrieve($('#q').value, 3), top = hits[0] ? hits[0].score : 1;
          $$('#shelf span').forEach((s) => s.classList.toggle('hit', hits.some((x) => x.id === s.dataset.id)));
          $('#hits').innerHTML = hits.length ? hits.map((x, i) => `<div class="hit-card"><span class="rank">${i + 1}</span><b><code>${x.id}</code>${esc(x.title)}</b><span class="bar" title="Relevance ${x.score.toFixed(1)}"><i style="width:${Math.round(x.score / top * 100)}%"></i></span><p>${esc(x.text)}</p></div>`).join('') : '<p class="hint">No clause matches those words.</p>';
        };
        paint(); $('#q').oninput = paint;
      },
      next: () => cur() ? { label: 'Let the agent explain', act: () => go(5) } : { label: 'Go to the report', act: () => go(8) },
    },

    /* 5 */ {
      stage: 2, name: 'Explain and prove it', tech: 'Language model + grounding check',
      title: 'The agent explains, then has to prove every claim.',
      plain: 'It writes a short finding. Before anyone sees it, a separate check traces each number and each policy reference back to a source. Anything it cannot trace gets the draft blocked.',
      body: () => cur() ? `${tabs()}
        <div class="cols">
          <div class="card"><div class="row-between"><h2>The agent’s finding</h2><span id="x-tag"></span></div><div class="explain" id="x-draft"></div><div class="row-between" style="margin-top:14px"><span class="hint" id="x-src" style="margin:0"></span><button class="btn small danger" id="x-lie"></button></div></div>
          <div class="card"><h2>Proof for every claim</h2><ul class="proof" id="x-proof"></ul></div>
        </div><div id="x-out"></div>` : nothing(),
      mount: () => { if (cur()) { $('#x-lie').onclick = toggleLie; playExplain(!S.played['5-' + S.fi]); } },
      next: () => cur() ? { label: 'Size the money', act: () => go(6) } : { label: 'Go to the report', act: () => go(8) },
    },

    /* 6 */ {
      stage: 3, name: 'Size the money', tech: 'Rules · the client’s own threshold',
      title: 'Work out what it costs and who should decide.',
      plain: 'A finance step puts a dollar figure on the finding, then the company’s own escalation rule picks the owner. Small amounts go to the project manager, larger ones to the Finance Controller.',
      body: () => {
        const A = analysis();
        if (!A.findings.length) return nothing();
        if (!A.exceptions.length) return `<div class="card"><div class="calc"><div class="res" style="color:var(--olive)">$0<small>at risk</small></div></div><p class="banner"><b>Nothing to size.</b> The policy explained the difference, so the agent cleared it with a citation. It is logged, and nobody needs to act.</p></div>`;
        const rule = D.POLICY.find((p) => p.id === '§8.1');
        return A.exceptions.map((f) => { const fc = f.route === 'Finance Controller'; return `<div class="card">
            <h2>${f.label}</h2>
            <div class="calc"><div>${f.calc[0]}<small>hours in question</small></div><span class="op">×</span><div>${f.calc[1].replace(' difference', '')}<small>${f.calc[1].includes('difference') ? 'rate difference' : 'billing rate'}</small></div><span class="op">=</span><div class="res">${money(f.impact)}<small>exposure</small></div></div>
            <div class="meter"><i data-w="${Math.min(f.impact / 1000, 1) * 100}" style="width:0"></i><span class="line"></span><span class="ends"><span>$0</span><span>$1,000+</span></span></div>
            <div class="owner"><span class="avatar">${fc ? 'FC' : 'PM'}</span><div><b>${f.route}</b><span>${money(f.impact)} is ${fc ? 'above' : 'not above'} $500, so ${fc ? 'it is escalated' : 'the project manager resolves it'}.</span></div></div>
          </div>`; }).join('') + `<p class="quote">${rule.id} ${rule.title}: ${rule.text}</p>`;
      },
      mount: () => { requestAnimationFrame(() => requestAnimationFrame(() => $$('.meter i').forEach((m) => { m.style.width = m.dataset.w + '%'; }))); },
      next: () => analysis().exceptions.length ? { label: 'Send to a reviewer', act: () => go(7) } : { label: 'Go to the report', act: () => go(8) },
    },

    /* 7 */ {
      stage: 3, name: 'Human review', tech: 'Human in the loop',
      role: () => { const A = analysis(); return A.exceptions.length ? 'You are the ' + (A.exceptions.some((f) => f.route === 'Finance Controller') ? 'Finance Controller' : 'project manager') : null; },
      title: 'A person makes the call.',
      plain: 'The agent recommends; it does not decide. The reviewer sees the finding, the evidence and the suggested action, and nothing reaches payroll or an invoice until they approve.',
      body: () => {
        const A = analysis();
        if (!A.exceptions.length) return A.findings.length ? `<p class="banner"><b>Nothing for a person to decide.</b> The difference was explained by policy and cleared automatically. A reviewer can still spot-check it from the audit trail.</p>` : nothing();
        return `<div class="card">
          ${A.exceptions.map((f) => `<div class="review-item"><h3>${esc(f.rec.emp)} · ${f.label}<span class="tag warn">${money(f.impact)}</span></h3><p>${esc(f.draft)}</p><p class="do">Suggested action: ${esc(f.action)}</p></div>`).join('')}
          <div class="decide" id="decide"></div>
        </div><div id="decided"></div>`;
      },
      mount: () => { if (analysis().exceptions.length) paintDecision(); },
      next: () => !analysis().exceptions.length || S.decision ? { label: 'See the report', act: () => go(8) } : { label: 'Approve', act: () => decide('Approved') },
    },

    /* 8 */ {
      stage: 3, name: 'Report and audit trail', tech: 'Audit log',
      title: 'Everything that happened, written down.',
      plain: 'Every step left a line: who did what, when, and on what evidence. This is what makes the workflow safe to run and easy to defend to an auditor.',
      body: () => {
        const A = analysis(), ex = A.exceptions;
        const outcome = !A.findings.length ? ['', '<b>Auto-cleared.</b> All checks passed. No AI call, no reviewer time.']
          : !ex.length ? ['', '<b>Auto-cleared by the agent.</b> The policy explained the difference, with a citation on file.']
          : S.decision === 'Approved' ? ['', `<b>Approved.</b> ${ex.map((f) => esc(f.action)).join(' ')}`]
          : S.decision ? ['warn', '<b>Sent back to the employee</b> for more information. Nothing was changed.']
          : ['warn', `<b>Waiting for review.</b> ${money(A.total)} is on hold until a person decides.`];
        return `<p class="banner ${outcome[0]}" style="margin:0 0 16px">${outcome[1]}</p>
          <div class="card"><div class="row-between"><h2>Audit trail · ${A.rec.id}</h2>${ex.length ? '<button class="btn small outline" id="csv">Download the report (CSV)</button>' : ''}</div><ol class="log">${trail().map((l) => `<li class="${l[3] || ''}"><time>${l[0]}</time><span><b>${l[1]}</b> ${l[2]}</span></li>`).join('')}</ol></div>`;
      },
      mount: () => { const b = $('#csv'); if (b) b.onclick = () => csv(analysis().exceptions, 'timesheet-finding.csv'); },
      next: () => ({ label: 'Now run the whole week', act: () => go(9) }),
    },

    /* 9 */ {
      stage: 4, name: 'Run the whole week', tech: 'Same pipeline, every timesheet',
      title: 'Now do that for everyone, at once.',
      plain: `You just walked one timesheet through by hand. The same steps run across all ${N} timesheets from ${PEOPLE} people in a few seconds, and only the real problems reach a person.`,
      body: () => `<div class="card"><h2>${D.WEEK} · ${N} timesheets</h2>
          <div class="tiles" id="tiles">${D.RECORDS.map((r) => `<i data-id="${r.id}" title="${esc(r.emp)} · ${esc(r.projectName)}"></i>`).join('')}</div>
          <div class="legend"><span><i style="background:var(--olive-soft)"></i>Passed every check</span><span><i style="background:var(--olive)"></i>Flagged, then cleared by policy</span><span><i style="background:var(--amber)"></i>Sent to a person</span></div>
        </div><div id="week-out"></div>`,
      mount: () => { if (S.week) paintWeek(false); },
      next: () => S.busy ? { label: 'Running…', disabled: true } : S.week ? { label: 'What is it worth?', act: () => go(10) } : { label: `Run all ${N} timesheets`, act: runWeek },
    },

    /* 10 */ {
      stage: 4, name: 'Value and next teams', tech: 'Business case',
      title: 'What it is worth, and where it goes next.',
      plain: 'Two questions every client asks at the end: how much does this save, and can the rest of the company use it? Move the sliders; pick another department.',
      body: () => `<div class="cols">
          <div class="card"><h2>What is it worth?</h2>
            <label class="slider">Hours spent checking each month <output id="o-hours"></output><input type="range" id="i-hours" min="10" max="160" step="5" value="40"></label>
            <label class="slider">Loaded cost per hour <output id="o-rate"></output><input type="range" id="i-rate" min="30" max="150" step="5" value="65"></label>
            <label class="slider">Share of flagged money that is real loss <output id="o-leak"></output><input type="range" id="i-leak" min="0" max="30" step="1" value="10"></label>
            <div id="value"></div>
          </div>
          <div class="card"><h2>Which parts carry over?</h2><div class="tabs" id="cases"></div><div id="arch"></div></div>
        </div>
        <details class="card"><summary>What this demo proves, and what still needs engineering</summary><ul class="todo">${CHECK.map((c) => `<li><span>${c[0]}</span><span class="tag ${c[1]}">${c[2]}</span></li>`).join('')}</ul></details>`,
      mount: () => { ['i-hours', 'i-rate', 'i-leak'].forEach((id) => { $('#' + id).oninput = paintValue; }); paintValue(); paintArch(); },
      next: () => ({ label: 'Try another timesheet', act: () => go(0) }),
    },
  ];

  /* ================= step helpers ================= */
  const cur = () => { const F = analysis().findings; return F[Math.min(S.fi, F.length - 1)]; };
  const nothing = () => `<p class="banner"><b>Nothing to do here.</b> Every check passed, so the agent was never called. Go back to the start and pick a story with a problem in it to see this step work.</p>`;
  const tabs = () => { const F = analysis().findings; return F.length > 1 ? `<div class="tabs">${F.map((f, i) => `<button data-fi="${i}" class="${i === S.fi ? 'on' : ''}">${f.label}</button>`).join('')}</div>` : ''; };

  async function playExplain(animate) {
    const run = ++S.run, f = cur();
    if (animate && S.useLive && !f.blocked && f.source === 'scripted' && !f.asked) {
      f.asked = true; $('#x-draft').textContent = 'Claude is writing…';
      try { await modelDraft(f); } catch (err) { toast('Live model unavailable, using the offline draft.'); }
      if (run !== S.run) return;
    }
    const shown = f.blocked || { text: f.draft, grounding: f.grounding, source: f.source };
    const g = shown.grounding, who = { scripted: 'Written by the offline stand-in', model: 'Written by Claude, live', injected: 'A made-up draft, planted for this test' };
    $('#x-tag').innerHTML = f.blocked ? '<span class="tag stop">Draft blocked</span>' : `<span class="tag ${f.verdict === 'cleared' ? 'good' : 'warn'}">${f.verdict === 'cleared' ? 'Cleared' : 'Exception'}</span>`;
    $('#x-src').textContent = who[shown.source];
    $('#x-lie').textContent = f.blocked ? 'Restore the honest draft' : 'Make the AI lie';
    $('#x-proof').innerHTML = g.claims.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><span class="ic">${c.ok ? '✓' : '✕'}</span><b>${esc(c.text)}</b><span>${c.ok ? c.source : 'no source found'}</span></li>`).join('');
    $('#x-out').innerHTML = '';
    const draft = $('#x-draft');
    if (animate) for (let i = 0; i <= shown.text.length; i += 3) { draft.textContent = shown.text.slice(0, i); await sleep(10); if (run !== S.run) return; }
    draft.innerHTML = g.parts.map((p) => p.claim ? `<mark>${esc(p.text)}</mark>` : esc(p.text)).join('');
    const marks = $$('mark', draft), rows = $$('#x-proof li');
    for (let i = 0; i < marks.length; i++) {
      if (animate) { await sleep(150); if (run !== S.run) return; }
      marks[i].className = g.claims[i].ok ? 'ok' : 'bad'; rows[i].classList.add('shown');
    }
    S.played['5-' + S.fi] = true;
    $('#x-out').innerHTML = f.blocked
      ? `<p class="banner stop fade-in"><b>Blocked.</b> ${g.unsupported.length} of ${g.total} claims have no source (${g.unsupported.map(esc).join(', ')}), so this draft never reaches the reviewer. That is a hallucination being caught. The verified draft is used instead.</p>`
      : `<p class="banner fade-in"><b>${g.supported} of ${g.total} claims traced to a source.</b> ${f.verdict === 'cleared' ? 'The policy explains the difference, so this is cleared without bothering anyone.' : 'The finding is safe to put in front of a reviewer.'}</p>`;
  }

  function toggleLie() {
    const f = cur();
    if (f.blocked) { f.blocked = null; f.draft = f.scripted; f.source = 'scripted'; f.grounding = E.verify(f); }
    else { E.hallucinate(f); f.wasBlocked = true; }
    playExplain(true);
  }

  async function modelDraft(f) {
    const item = { id: f.id, finding: f.label, record: { employee: f.rec.emp, role: f.rec.role, project: f.rec.projectName, submitted_hours: f.rec.submitted, client_approved_hours: f.rec.approved, erp_billed_hours: f.rec.billed, billed_rate: f.rec.rate, rate_card: f.rec.cardRate }, facts: f.facts, note: f.rec.note, overtime_register: D.OT_REGISTER, policy: f.retrieved.map((p) => ({ id: p.id, title: p.title, text: p.text })) };
    const res = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [item] }) });
    if (!res.ok) throw new Error((await res.json()).error || 'request failed');
    const o = (await res.json()).items[0];
    if (o && o.explanation) E.applyDraft(f, o.explanation, 'model');
  }

  function paintDecision() {
    const el = $('#decide');
    if (S.decision) {
      el.innerHTML = `<span class="tag ${S.decision === 'Approved' ? 'good' : 'warn'}">${S.decision}</span><span class="hint" style="margin:0">${S.comment ? '“' + esc(S.comment) + '”' : 'No comment added.'}</span><button class="btn small outline" id="undo" style="margin-left:auto">Change</button>`;
      $('#undo').onclick = () => { S.decision = null; paintDecision(); renderNav(); };
      $('#decided').innerHTML = `<p class="banner ${S.decision === 'Approved' ? '' : 'warn'} fade-in"><b>${S.decision}.</b> ${S.decision === 'Approved' ? 'The action is released to the owner.' : 'The employee is asked for more information.'} Your decision and comment are now part of the audit trail.</p>`;
    } else {
      el.innerHTML = `<input type="text" id="comment" placeholder="Add a comment (optional)" value="${esc(S.comment)}"><button class="btn outline" id="d-back">Send back</button><button class="btn primary" id="d-ok">Approve</button>`;
      $('#comment').oninput = (e) => { S.comment = e.target.value; };
      $('#d-back').onclick = () => decide('Sent back'); $('#d-ok').onclick = () => decide('Approved');
      $('#decided').innerHTML = '';
    }
  }
  function decide(d) { S.decision = d; S.stamp.decided = new Date(); paintDecision(); renderNav(); renderSide(); }

  function trail() {
    const A = analysis(), r = A.rec, at = (k) => clock(S.stamp[k] || new Date());
    const failed = A.checks.filter((c) => c.pass === false), F = A.findings;
    const out = [
      [at(1), 'Employee', `${esc(r.emp)} submitted ${E.h(r.submitted)}h on ${esc(r.projectName)}.`, 'person'],
      [at(2), 'Intake', `joined timekeeping, client approval (${r.approved == null ? 'none' : E.h(r.approved) + 'h'}) and ERP billing (${E.h(r.billed)}h at $${r.rate}/h).`],
      [at(3), 'Validation', failed.length ? `ran ${A.checks.length} checks; failed: ${failed.map((c) => E.TYPE_LABEL[c.key].toLowerCase()).join(', ')}.` : `ran ${A.checks.length} checks; all passed. No model was called.`],
    ];
    if (F.length) {
      const claims = F.reduce((s, f) => s + f.grounding.total, 0), blocked = F.filter((f) => f.wasBlocked).length;
      out.push([at(4), 'Policy agent', `retrieved ${[...new Set(F.flatMap((f) => f.retrieved.map((p) => p.id)))].join(', ')}.`]);
      out.push([at(5), 'Agent', `drafted ${F.length} finding${F.length > 1 ? 's' : ''}: ${F.map((f) => f.label.toLowerCase() + ' ' + (f.verdict === 'cleared' ? 'cleared' : 'kept as an exception')).join(', ')}.`]);
      out.push([at(5), 'Guardrail', `traced ${claims} claims to their sources${blocked ? `; blocked ${blocked} unsupported draft` : ''}.`]);
      out.push([at(6), 'Finance', A.exceptions.length ? `sized ${money(A.total)} of exposure; owner: ${[...new Set(A.exceptions.map((f) => f.route))].join(' and ')} (§8.1).` : 'nothing at risk; auto-cleared.']);
      if (A.exceptions.length) out.push(S.decision ? [clock(S.stamp.decided), 'Reviewer', `${S.decision.toLowerCase()}${S.comment ? ': “' + esc(S.comment) + '”' : '.'}`, 'person'] : [at(7), 'Reviewer', 'has not decided yet.', 'person']);
    }
    out.push([at(8), 'Report', 'filed this trail. No write-back to payroll in this demo.']);
    return out;
  }

  function csv(list, name) {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['Timesheet', 'Employee', 'Project', 'Finding', 'Exposure USD', 'Owner', 'Action', 'Explanation', 'Policy cited']]
      .concat(list.map((x) => [x.id, x.rec.emp, x.rec.projectName, x.label, Math.round(x.impact), x.route, x.action, x.draft, x.governing.join(' ')]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------- whole week ---------- */
  function weekData() {
    const cands = E.scan(D.RECORDS, { noteScreen: true }), results = cands.map(E.review);
    const ex = results.filter((x) => x.verdict === 'exception');
    return { cands, results, ex, pm: ex.filter((x) => x.route === 'Project manager'), fc: ex.filter((x) => x.route === 'Finance Controller'), total: ex.reduce((s, x) => s + x.impact, 0), rules: E.score(cands.map((c) => c.rec.id), D.RECORDS), agent: E.score(ex.map((x) => x.id), D.RECORDS) };
  }
  async function runWeek() {
    S.busy = true; renderNav();
    const run = ++S.run, W = weekData(), flagged = new Set(W.cands.map((c) => c.rec.id));
    const tile = (id, cls) => { const t = $(`#tiles i[data-id="${id}"]`); if (t) t.className = cls; };
    for (const r of D.RECORDS) { tile(r.id, flagged.has(r.id) ? 'flag' : 'ok'); await sleep(35); if (run !== S.run) { S.busy = false; return; } }
    await sleep(350);
    for (const x of W.results) { tile(x.id, x.verdict); await sleep(110); if (run !== S.run) { S.busy = false; return; } }
    S.week = W; S.busy = false; paintWeek(true); renderNav(); renderSide();
  }
  function paintWeek(animate) {
    const W = S.week, flagged = new Set(W.cands.map((c) => c.rec.id));
    D.RECORDS.forEach((r) => { const x = W.results.find((y) => y.id === r.id); $(`#tiles i[data-id="${r.id}"]`).className = x ? x.verdict : flagged.has(r.id) ? 'flag' : 'ok'; });
    $('#week-out').innerHTML = `<div class="${animate ? 'fade-in' : ''}">
      <div class="stats">
        <div class="stat"><b>${N - W.ex.length}</b><span>cleared with no human time</span></div>
        <div class="stat warn"><b>${W.pm.length}</b><span>to project managers</span></div>
        <div class="stat warn"><b>${W.fc.length}</b><span>to the Finance Controller</span></div>
        <div class="stat"><b>${money(W.total)}</b><span>flagged for a decision</span></div>
      </div>
      <div class="card" style="margin-top:16px"><h2>Checked against a hand-labelled answer key</h2>
        <div class="versus"><div><b>Rules alone: ${W.rules.flagged} flags</b><span>${W.rules.fp} were false alarms (${pct(W.rules.precision)} precision). A reviewer wastes time on every one.</span></div><span class="arrow">→</span><div><b>With the agent: ${W.agent.flagged} flags</b><span>${W.agent.fp} false alarms, ${W.agent.fn} missed (${pct(W.agent.precision)} precision, ${pct(W.agent.recall)} recall).</span></div></div>
        <p class="hint">${N} rows is a smoke test, not a full evaluation. A pilot would need a few hundred labelled rows. <button class="btn small outline" id="wcsv" style="margin-left:8px">Download the exception report (CSV)</button></p>
      </div></div>`;
    $('#wcsv').onclick = () => csv(W.ex, 'exception-report.csv');
  }

  /* ---------- value and reuse ---------- */
  function paintValue() {
    const hours = +$('#i-hours').value, rate = +$('#i-rate').value, leak = +$('#i-leak').value, W = S.week || weekData();
    $('#o-hours').textContent = hours + ' h'; $('#o-rate').textContent = '$' + rate; $('#o-leak').textContent = leak + '%';
    const labour = hours * 12 * 0.7 * rate, leakage = W.total * (D.HEADCOUNT / PEOPLE) * 52 * leak / 100;
    $('#value').innerHTML = `<div class="value-total"><strong>${money(labour + leakage)}</strong><span>a year</span></div>
      <div class="value-split"><div><b>${money(labour)}</b>${Math.round(hours * 12 * 0.7)} hours handed back</div><div><b>${money(leakage)}</b>billing and payroll errors caught</div></div>
      <p class="hint">Assumes 70% of checking time is removed, and that the ${money(W.total)} flagged in this sample week is typical for ${D.HEADCOUNT} people. Both are assumptions to test in a pilot.</p>`;
  }
  const BLOCKS = ['Review screen', 'Exception report', 'Rules checks', 'Policy search', 'Explanation drafting', 'Grounding check', 'Money and routing', 'Audit trail', 'Evaluation set', 'Policy store', 'ERP link', 'Timekeeping link', 'Client approval link'];
  const CASES = {
    invoices: { name: 'Supplier invoices', off: ['Timekeeping link', 'Client approval link'], add: ['Invoice reader', 'Purchasing link'], line: 'Match the invoice, the purchase order and the goods receipt. Same pattern: line up, compare, read the exception, cite the contract.' },
    expenses: { name: 'Expense claims', off: ['Timekeeping link', 'Client approval link'], add: ['Receipt reader', 'Card feed'], line: 'Check claims against receipts and the travel policy.' },
    workorders: { name: 'Work orders', off: ['Client approval link'], add: ['Maintenance system link', 'Asset register'], line: 'Reconcile labour and parts on closed work orders before billing.' },
  };
  const CHECK = [
    ['Unsupported claims are blocked before review', 'good', 'Shown here'], ['A person approves before anything is released', 'good', 'Shown here'],
    ['Every decision leaves an audit line', 'good', 'Shown here'], ['Results are scored against labelled answers', 'good', 'Shown here, small set'],
    ['Monitoring: override rate, drift, cost per run', 'warn', 'Designed'], ['Manual fallback and rollback', 'warn', 'Designed'],
    ['Live links to the real ERP and timekeeping', '', 'To build'], ['Access control and masking of personal data', '', 'To build'],
  ];
  function paintArch() {
    const c = CASES[S.caseId];
    $('#cases').innerHTML = Object.entries(CASES).map(([k, v]) => `<button data-case="${k}" class="${k === S.caseId ? 'on' : ''}">${v.name}</button>`).join('');
    $('#arch').innerHTML = `<div class="blocks">${BLOCKS.map((b) => `<span class="block ${c.off.includes(b) ? 'off' : ''}">${b}</span>`).join('')}${c.add.map((b) => `<span class="block new">${b}</span>`).join('')}</div>
      <p class="reuse"><b>${BLOCKS.length - c.off.length} of ${BLOCKS.length}</b>parts reused, ${c.add.length} new. ${c.line}</p>`;
  }

  /* ================= shell ================= */
  function renderSide() {
    const clean = S.T && S.played[3] && !analysis().findings.length;
    let html = '', stage = 0;
    STEPS.forEach((st, n) => {
      if (!n) return;
      if (st.stage !== stage) { stage = st.stage; html += `<h4>Stage ${stage} · ${STAGES[stage]}</h4>`; }
      const cls = n === S.step ? 'on' : clean && n >= 4 && n <= 7 ? 'skip' : n <= S.seen ? 'done' : '';
      html += `<button data-go="${n}" class="${cls}" ${!S.T && n < 9 ? 'disabled' : ''}><span class="dot">${cls === 'done' ? '✓' : n}</span>${st.name}</button>`;
    });
    $('#side').innerHTML = html;
  }

  function renderNav() {
    const st = STEPS[S.step], nx = st.next ? st.next() : null;
    $('#nav').style.display = S.step ? '' : 'none';
    if (!S.step) return;
    $('#nav').innerHTML = `<button class="btn outline" data-go="${S.step - 1}">← Back</button><span class="where">Step ${S.step} of ${STEPS.length - 1}</span><button class="btn primary" id="next" ${nx.disabled ? 'disabled' : ''}>${nx.label}${nx.disabled ? '' : ' →'}</button>`;
    $('#next').onclick = () => { const cur = STEPS[S.step].next(); if (!cur.disabled) cur.act(); };
  }

  function render(back) {
    const st = STEPS[S.step];
    const role = typeof st.role === 'function' ? st.role() : st.role;
    const head = S.step ? `<p class="crumbs"><span class="stage">Stage ${st.stage} · ${STAGES[st.stage]}</span><span class="tag">${st.tech}</span>${role ? `<span class="tag role">${role}</span>` : ''}</p><h1>${st.title}</h1><p class="plain">${st.plain}</p>` : '';
    $('#screen').innerHTML = `<div class="screen ${back ? 'back' : ''}">${head}${st.body()}</div>`;
    renderSide(); renderNav(); renderNotes();
    if (st.mount) st.mount();
    window.scrollTo({ top: 0 });
  }

  function go(n) {
    n = Math.max(0, Math.min(STEPS.length - 1, n));
    if (n > 0 && !S.T) { S.T = blank(); }
    const back = n < S.step;
    S.run++; S.busy = false;
    S.step = n; S.seen = Math.max(S.seen, n - 1);
    if (!S.stamp[n]) S.stamp[n] = new Date();
    render(back);
  }

  function startStory(i) {
    const s = STORIES[i];
    S.T = s ? Object.assign(blank(), { emp: s.emp, project: s.project, days: s.days.slice(), note: s.note, approved: s.approved ?? null, billed: s.billed ?? null }) : blank();
    S.stamp = {}; S.seen = 0; dirty(); go(1);
  }

  function renderMode() {
    const b = $('#mode');
    b.className = 'mode' + (S.useLive ? ' live' : '');
    b.textContent = S.useLive ? 'Live · Claude writes the findings' : 'Offline · scripted findings';
    b.disabled = !S.liveAvailable;
    b.title = S.liveAvailable ? 'Switch between the live model and the offline stand-in' : 'Runs fully offline. Set ANTHROPIC_API_KEY and start with node server.js to let Claude write the findings.';
  }

  let toastTimer;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3000); }

  /* ================= presenter notes ================= */
  const NOTES = [
    { idea: 'The demo follows one timesheet through every step a real system would take, so each idea is shown once, on its own screen.', say: ['“I took the timesheet example from your material and built it as something you can click through, not a slide.”', 'Pick “Overtime on a verbal OK” for the main walk-through. It touches every step.', 'Keep “A borrowed approval number” and “Travel days” as follow-ups if there is time.'], qa: [] },
    { idea: 'Step one of any project: understand the work as the user does it. Here that is a person typing hours and a note.', say: ['“This is the employee’s view. The interesting part is the free-text note: a spreadsheet formula cannot read it.”', 'Point at the total turning amber above 40 hours.'], qa: [] },
    { idea: 'The real problem is not one system. It is three systems that each hold a slightly different version of the truth.', say: ['“The 40 hours a month goes on lining these three up by hand.”', 'Change the approved hours to show a mismatch appear live.'], qa: [['Where would this data come from in real life?', 'Connectors to the timekeeping tool, the client approval portal and the ERP. In this demo they are dummy records.']] },
    { idea: 'Rules (ordinary automation) answer yes-or-no questions exactly. No AI is needed, and none is used here.', say: ['“Most of this job is plain automation. I say that to clients early because it sets cost and risk expectations.”', '“Rules can spot that something is off. They cannot tell whether it is allowed.”'], qa: [['Why not use an LLM for everything?', 'Exact comparison is a job for code. A model there adds cost and a chance of error with no benefit.']] },
    { idea: 'RAG (retrieval-augmented generation): before the AI answers, it searches the company’s own documents and reads the relevant passage, instead of answering from memory.', say: ['“The agent looks up the rule first. The highlighted clause numbers are what the search returned.”', 'Type a question of your own, for example “travel time”, to show the search is live.'], qa: [['Why keyword search and not embeddings?', 'Twelve short clauses with exact vocabulary. Keyword search (BM25) is transparent and gets the right clause every time here. I would add embeddings when the documents are longer or people phrase things differently.']] },
    { idea: 'A hallucination is the AI stating something that is not in its sources. Grounding means every claim must be traceable to a source. The check here does that mechanically and blocks drafts that fail.', say: ['“Each underlined figure is a claim. The list on the right shows where each one came from.”', 'Press “Make the AI lie”. The invented numbers and the fake clause go red and the draft is blocked.', '“This is the safety story: a wrong answer is stopped before a person ever reads it.”'], qa: [['Is a real model running?', 'By default the wording is scripted so the demo cannot fail on bad wifi. With an API key the server sends the same evidence to Claude and the same check judges what comes back.'], ['What does the check not catch?', 'It proves the figures are sourced, not that the reasoning is right. That is why a person still approves.']] },
    { idea: 'Finance turns the finding into money and uses the client’s own rule to decide who owns it.', say: ['“Hours times rate gives the exposure. The $500 threshold is the client’s policy, not mine.”', '“Routing by rule keeps the model out of decisions about authority.”'], qa: [] },
    { idea: 'Human in the loop: the AI recommends, a person decides. Nothing with money attached happens automatically.', say: ['“The reviewer gets the finding, the evidence and a suggested action, and takes seconds instead of minutes.”', 'Type a comment and approve, so it shows up in the audit trail.'], qa: [['When would you remove the human?', 'Only for low-value, high-confidence cases, and only after the override rate in production shows the agent is right.']] },
    { idea: 'An audit trail is the record of who did what, when, and why. It is what lets a company trust and defend an automated process.', say: ['“Every step wrote a line. Amber dots are people, green dots are the system.”', '“The output is a CSV because adoption depends on fitting how finance already works.”'], qa: [] },
    { idea: 'Precision: of the items flagged, how many were real problems. Recall: of the real problems, how many were found. Both are measured against answers a person labelled by hand.', say: ['“Same pipeline, every timesheet. Rules alone raise 18 flags and 6 are false alarms; with the agent all 12 flags are real.”', 'Say the caveat yourself: 38 rows is a smoke test.'], qa: [['How would you evaluate this properly?', 'A few hundred labelled rows, a held-out set, and in production the rate at which reviewers overturn the agent.']] },
    { idea: 'A platform means the next team reuses the same parts instead of starting again.', say: ['“The labour saving is modest. The bigger number is errors caught, and that is an assumption to test in a pilot.”', '“I have not deployed a company-wide platform. What I can show is which parts carry over.”', 'Open the list at the bottom: it separates what the demo proves from what still needs engineering.'], qa: [['What is the biggest risk in scaling?', 'Data access and ownership, not the model. Connectors, permissions and who signs off take longer than the agent.']] },
  ];
  function renderNotes() {
    const n = NOTES[S.step], st = STEPS[S.step];
    $('#notes').innerHTML = `<button class="close" data-act="notes">Close ✕</button>
      <p class="eyebrow">${S.step ? 'Step ' + S.step : 'Before you start'}</p><h2>${S.step ? st.name : 'Opening'}</h2>
      <p class="idea">${n.idea}</p>
      <h3>Say and show</h3><ul>${n.say.map((s) => `<li>${s}</li>`).join('')}</ul>
      ${n.qa.length ? `<h3>If they ask</h3>${n.qa.map((q) => `<p class="qa"><b>${q[0]}</b><span>${q[1]}</span></p>`).join('')}` : ''}`;
  }

  /* ================= wiring ================= */
  const toggleNotes = () => $('#notes').classList.toggle('open');
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.go != null) go(+t.dataset.go);
    else if (t.dataset.story != null) startStory(+t.dataset.story);
    else if (t.dataset.fi != null) { S.fi = +t.dataset.fi; render(); }
    else if (t.dataset.case) { S.caseId = t.dataset.case; paintArch(); }
    else if (t.dataset.act === 'notes' || t.id === 'notesBtn') toggleNotes();
    else if (t.id === 'home') go(0);
    else if (t.id === 'mode' && S.liveAvailable) { S.useLive = !S.useLive; renderMode(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target.tagName, typing = tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && e.target.type !== 'checkbox');
    if (e.key === 'Escape') return $('#notes').classList.remove('open');
    if (typing && e.key !== 'Enter') return;
    if (e.key === 'n' || e.key === 'N') toggleNotes();
    else if (e.key === 'ArrowRight' && S.step) { const b = $('#next'); if (b && !b.disabled) b.click(); }
    else if (e.key === 'ArrowLeft' && S.step) go(S.step - 1);
    else if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON' && S.step) { const b = $('#next'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  });

  renderMode(); render();
  if (location.protocol.startsWith('http')) {
    fetch('/api/status').then((r) => r.json()).then((s) => { S.liveAvailable = !!s.live; S.useLive = !!s.live; renderMode(); }).catch(() => {});
  }
})();
