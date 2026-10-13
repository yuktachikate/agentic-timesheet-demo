/* The working parts: rules scan, BM25 retrieval, agent review, grounding check, evaluation.
   Everything here runs for real in the browser. The only scripted piece is the wording of the
   draft explanation when no live model is connected. */
(function (root) {
  const D = root.DEMO_DATA;

  /* ---------- formatting ---------- */
  const h = (x) => String(Math.round(x * 100) / 100);
  const usd = (x) => Math.round(x).toLocaleString('en-US');

  /* ---------- retrieval: BM25 over the policy sections ---------- */
  const STOP = new Set('a an the of to in on at for and or is are be by with from that this it as not was were than its any only when where which no so has does do'.split(' '));
  const stem = (w) => {
    if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  };
  const tokens = (t) => (t.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w)).map(stem);

  const INDEX = (() => {
    const docs = D.POLICY.map((p) => {
      const tf = {};
      const toks = tokens(p.title + ' ' + p.title + ' ' + p.text);
      toks.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
      return { p, tf, len: toks.length };
    });
    const df = {};
    docs.forEach((d) => Object.keys(d.tf).forEach((t) => { df[t] = (df[t] || 0) + 1; }));
    const avg = docs.reduce((s, d) => s + d.len, 0) / docs.length;
    return { docs, df, avg, n: docs.length };
  })();

  function retrieve(query, k = 3) {
    const K1 = 1.5, B = 0.75;
    const q = [...new Set(tokens(query))];
    return INDEX.docs.map((d) => {
      let score = 0;
      q.forEach((t) => {
        const f = d.tf[t];
        if (!f) return;
        const idf = Math.log(1 + (INDEX.n - INDEX.df[t] + 0.5) / (INDEX.df[t] + 0.5));
        score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / INDEX.avg));
      });
      return { id: d.p.id, title: d.p.title, text: d.p.text, score };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  }

  /* ---------- step 1: deterministic rules scan (no AI) ---------- */
  const weeklyTotals = (records) => {
    const seen = new Set(), totals = {};
    records.forEach((r) => {
      const key = r.emp + '|' + r.project;
      if (seen.has(key)) return;            // a duplicate must not inflate the week
      seen.add(key);
      totals[r.emp] = (totals[r.emp] || 0) + r.submitted;
    });
    return totals;
  };

  const MISALLOC = /(\d+(?:\.\d+)?)\s*h(?:ours)?\s+(?:for|on)\s+(\w+).*(?:logged here|code was locked)/i;

  // Every check for one timesheet, pass or fail. Used by the step-by-step walk-through.
  function inspect(r) {
    const na = r.approved == null;
    const checks = [
      { key: 'MISSING_APPROVAL', label: 'Client approval is on file', pass: !na, detail: na ? 'No approval found' : `${h(r.approved)}h approved` },
      { key: 'RATE', label: 'Billing rate matches the rate card', pass: r.rate === r.cardRate, detail: `$${r.rate}/h billed, $${r.cardRate}/h on the card` },
      { key: 'HOURS', label: 'Submitted hours equal approved hours', pass: na ? null : r.submitted === r.approved, detail: na ? 'Skipped: nothing to compare with' : `${h(r.submitted)}h submitted, ${h(r.approved)}h approved` },
      { key: 'BILLED', label: 'Billed hours equal approved hours', pass: na ? null : r.billed === r.approved, detail: na ? 'Skipped: nothing to compare with' : `${h(r.billed)}h billed, ${h(r.approved)}h approved` },
      { key: 'OVERTIME', label: 'The week is 40 hours or less', pass: r.submitted <= 40, detail: `${h(r.submitted)}h this week` },
      { key: 'MISALLOCATION', label: 'The note does not point to another project', pass: !MISALLOC.test(r.note), detail: r.note ? (MISALLOC.test(r.note) ? 'The note mentions hours for a different project' : 'Note read, nothing unusual') : 'No note' },
    ];
    return { checks, candidates: checks.filter((c) => c.pass === false).map((c) => ({ rec: r, type: c.key, weekTotal: r.submitted })) };
  }

  function scan(records, opts = {}) {
    const totals = weeklyTotals(records);
    const lastRow = {};
    records.forEach((r) => { lastRow[r.emp] = r.id; });
    const seen = new Set();
    const out = [];
    records.forEach((r) => {
      const key = r.emp + '|' + r.project;
      let type = null;
      if (seen.has(key)) type = 'DUPLICATE';
      else if (r.approved == null) type = 'MISSING_APPROVAL';
      else if (r.rate !== r.cardRate) type = 'RATE';
      else if (r.submitted !== r.approved) type = 'HOURS';
      else if (r.billed !== r.approved) type = 'BILLED';
      else if (totals[r.emp] > 40 && lastRow[r.emp] === r.id) type = 'OVERTIME';
      else if (opts.noteScreen && MISALLOC.test(r.note)) type = 'MISALLOCATION';
      seen.add(key);
      if (type) out.push({ rec: r, type, weekTotal: totals[r.emp] });
    });
    return out;
  }

  const TYPE_LABEL = {
    HOURS: 'Hours variance', OVERTIME: 'Overtime', BILLED: 'Billing variance',
    MISSING_APPROVAL: 'Missing approval', RATE: 'Rate mismatch', DUPLICATE: 'Duplicate',
    MISALLOCATION: 'Wrong project',
  };

  // The question the agent asks the policy for each kind of finding.
  const QUERY = {
    HOURS: 'submitted hours differ from client approved hours: rounding tolerance or not billable',
    OVERTIME: 'overtime hours above 40 in a week: pre-approval reference valid for employee, verbal approval',
    BILLED: 'invoiced hours billed do not equal client approved hours',
    MISSING_APPROVAL: 'timesheet has no approval on file, unapproved, approval deadline',
    RATE: 'billing rate does not match contract rate card for the role',
    DUPLICATE: 'duplicate timesheet for the same employee, project and week',
    MISALLOCATION: 'hours logged to another project code, project allocation',
  };

  /* ---------- step 2: the agent reviews one candidate ---------- */
  function review(c) {
    const r = c.rec;
    const first = r.emp.split(' ')[0];
    const query = (QUERY[c.type] + ' ' + r.note).trim();
    const retrieved = retrieve(query, 3);
    const facts = { submitted: r.submitted, billed: r.billed, rate: r.rate, cardRate: r.cardRate, weekTotal: c.weekTotal };
    if (r.approved != null) facts.approved = r.approved;
    let verdict = 'exception', governing = [], draft = '', action = '', impact = 0, judgement = false, calc = null;

    if (c.type === 'HOURS') {
      const diff = Math.abs(r.submitted - r.approved);
      facts.diff = diff;
      if (diff <= 0.25) {
        verdict = 'cleared'; governing = ['§2.1'];
        draft = `${r.emp} submitted ${h(r.submitted)}h and the client approved ${h(r.approved)}h. The ${h(diff)}h difference is within the 0.25h rounding tolerance, so it is accepted without review (§2.1).`;
      } else if (r.approved > r.submitted) {
        impact = diff * r.rate; governing = ['§2.1']; calc = [`${h(diff)}h`, `$${r.rate}/h`];
        draft = `The client approved ${h(r.approved)}h for ${r.emp}, more than the ${h(r.submitted)}h submitted. The ${h(diff)}h gap is above the 0.25h rounding tolerance (§2.1), so the timesheet and the approval need to be reconciled before billing. Exposure: $${usd(impact)}.`;
        action = 'Ask the project manager which figure is right before billing.';
      } else {
        impact = diff * r.rate; governing = ['§2.1', '§4.1']; calc = [`${h(diff)}h`, `$${r.rate}/h`];
        draft = `${r.emp} submitted ${h(r.submitted)}h on ${r.projectName}, but the client approved ${h(r.approved)}h. The ${h(diff)}h gap is above the 0.25h rounding tolerance (§2.1), so those hours are not billable and return to the project manager (§4.1). Exposure: $${usd(impact)}.`;
        action = `Return ${h(diff)}h to the project manager; keep them off the invoice.`;
      }
    } else if (c.type === 'OVERTIME') {
      const ot = c.weekTotal - 40;
      facts.overtime = ot; facts.threshold = 40;
      const ref = (r.note.match(/OT-\d+/) || [])[0];
      const reg = ref && D.OT_REGISTER.find((x) => x.ref === ref);
      if (reg) facts.registerHours = reg.hours;
      impact = ot * r.rate; calc = [`${h(ot)}h`, `$${r.rate}/h`];
      if (reg && reg.emp === r.emp && reg.hours >= ot) {
        verdict = 'cleared'; impact = 0; governing = ['§3.1', '§3.2'];
        draft = `${first} logged ${h(c.weekTotal)}h this week, ${h(ot)}h over the 40h threshold. The note cites ${ref}, and the overtime register shows ${ref} issued to ${r.emp} for ${h(reg.hours)}h by ${reg.approver}. The pre-approval is valid (§3.1, §3.2).`;
      } else if (reg) {
        governing = ['§3.1', '§3.2'];
        draft = `${first} logged ${h(c.weekTotal)}h this week, ${h(ot)}h over the 40h threshold. The note cites ${ref}, but the register shows ${ref} was issued to ${reg.emp}. A reference only covers the employee it was issued for (§3.2), so the ${h(ot)}h are held from payroll until a retroactive request is approved (§3.1). Exposure: $${usd(impact)}.`;
        action = `Hold ${h(ot)}h from payroll; ask ${first} for a retroactive overtime request.`;
      } else {
        governing = ['§3.1']; judgement = !!r.note;
        draft = `${first} logged ${h(c.weekTotal)}h this week, ${h(ot)}h over the 40h threshold, with no overtime reference on file. ` +
          (r.note ? 'The note describes a verbal go-ahead, which is not sufficient (§3.1). ' : 'Written pre-approval is required (§3.1). ') +
          `The ${h(ot)}h are held from payroll until a retroactive request is approved. Exposure: $${usd(impact)}.`;
        action = `Hold ${h(ot)}h from payroll; ask ${first} for a retroactive overtime request.`;
      }
    } else if (c.type === 'BILLED') {
      const diff = Math.abs(r.billed - r.approved);
      facts.diff = diff;
      const travel = +(r.note.match(/(\d+(?:\.\d+)?)\s*h(?:ours)?\s+travel/i) || [])[1] || 0;
      const standby = +(r.note.match(/(\d+(?:\.\d+)?)\s*h(?:ours)?\s+stand-?by/i) || [])[1] || 0;
      impact = diff * r.rate; calc = [`${h(diff)}h`, `$${r.rate}/h`];
      if (travel && r.billed === r.approved - travel / 2) {
        verdict = 'cleared'; impact = 0; governing = ['§5.1', '§5.2'];
        facts.travel = travel; facts.worked = r.approved - travel; facts.travelBilled = travel / 2;
        draft = `The ERP billed ${h(r.billed)}h against ${h(r.approved)}h approved (§5.1). The note records ${h(travel)}h of travel, which bills at 50% (§5.2): ${h(r.approved - travel)}h worked plus ${h(travel / 2)}h travel is ${h(r.billed)}h. The invoice is correct.`;
      } else if (standby && r.billed < r.approved) {
        governing = ['§5.1', '§5.3']; facts.standby = standby;
        draft = `The ERP billed ${h(r.billed)}h against ${h(r.approved)}h approved, ${h(diff)}h short (§5.1). The note records ${h(standby)}h of stand-by after the client closed the site, which is billable at the full rate (§5.3). $${usd(impact)} of revenue is missing from the invoice.`;
        action = `Add ${h(diff)}h of stand-by to the invoice.`;
      } else {
        governing = ['§5.1'];
        const over = r.billed > r.approved;
        draft = `The ERP billed ${h(r.billed)}h for ${r.emp}, but the client approved ${h(r.approved)}h. Invoiced hours must equal approved hours (§5.1), so the client is ${over ? 'over' : 'under'}-billed by ${h(diff)}h, or $${usd(impact)}.`;
        action = `Correct the invoice to ${h(r.approved)}h before it is sent.`;
      }
    } else if (c.type === 'MISSING_APPROVAL') {
      impact = r.submitted * r.rate; governing = ['§4.2']; calc = [`${h(r.submitted)}h`, `$${r.rate}/h`];
      draft = `No client approval is on file for ${r.emp}'s ${h(r.submitted)}h on ${r.projectName}. An unapproved timesheet is excluded from the invoice run and escalated to the project manager (§4.2). $${usd(impact)} of billing is on hold.`;
      action = 'Chase the client representative for sign-off.';
    } else if (c.type === 'RATE') {
      impact = Math.abs(r.rate - r.cardRate) * r.billed; governing = ['§6.1']; calc = [`${h(r.billed)}h`, `$${Math.abs(r.rate - r.cardRate)}/h difference`];
      draft = `${r.emp} was billed at $${r.rate}/h, but the rate card for a ${r.role} is $${r.cardRate}/h. A deviation needs a signed rate change order (§6.1) and none is referenced. Difference over ${h(r.billed)}h: $${usd(impact)}.`;
      action = `Re-bill at $${r.cardRate}/h or attach the rate change order.`;
    } else if (c.type === 'DUPLICATE') {
      impact = r.submitted * r.rate; governing = ['§7.1']; calc = [`${h(r.submitted)}h`, `$${r.rate}/h`];
      draft = `Two timesheets exist for ${r.emp} on ${r.projectName} this week, each for ${h(r.submitted)}h. Only one is allowed per employee, project and week (§7.1). Void the duplicate before payroll to avoid a $${usd(impact)} overpayment.`;
      action = 'Void the duplicate timesheet.';
    } else if (c.type === 'MISALLOCATION') {
      const m = r.note.match(MISALLOC);
      const hrs = +m[1];
      facts.moved = hrs; impact = hrs * r.rate; governing = ['§7.2']; calc = [`${h(hrs)}h`, `$${r.rate}/h`];
      draft = `The hours reconcile across every system, but the note says ${h(hrs)}h of this timesheet were worked for ${m[2]} and logged to ${r.projectName} because the code was locked. Hours must sit on the project where the work was done (§7.2). Transfer ${h(hrs)}h, worth $${usd(impact)}, before invoicing.`;
      action = `Transfer ${h(hrs)}h to ${m[2]} before invoicing.`;
    }

    facts.impact = impact;
    const res = {
      id: r.id, rec: r, type: c.type, label: TYPE_LABEL[c.type], weekTotal: c.weekTotal,
      verdict, governing, retrieved, query, facts, draft, scripted: draft, action, impact, judgement, calc: verdict === 'cleared' ? null : calc,
      route: verdict === 'cleared' ? 'Auto-cleared' : impact > 500 ? 'Finance Controller' : 'Project manager',
      source: 'scripted',
    };
    res.grounding = verify(res);
    return res;
  }

  /* ---------- step 3: grounding check ----------
     Every number, policy section and overtime reference in the explanation must trace back to
     the record, the computed facts, the register, or a policy section that was actually retrieved. */
  const CLAIM = /(§\d+\.\d+|OT-\d+|\$?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?)/g;
  const num = (s) => parseFloat(s.replace(/[$,%]/g, ''));

  const FACT_SOURCE = { submitted: 'timesheet', weekTotal: 'timesheet', approved: 'client approval', billed: 'ERP billing', rate: 'ERP billing', cardRate: 'rate card', registerHours: 'overtime register' };

  function verify(res, text) {
    const draft = text == null ? res.draft : text;
    const evidence = new Map();
    const add = (v, src) => { const k = Math.round(v * 100); if (typeof v === 'number' && !isNaN(v) && !evidence.has(k)) evidence.set(k, src); };
    Object.entries(res.facts).forEach(([k, v]) => { if (FACT_SOURCE[k]) add(v, FACT_SOURCE[k]); });
    (res.rec.note.match(CLAIM) || []).forEach((t) => add(num(t), 'employee note'));
    res.retrieved.forEach((p) => (p.text.replace(/§\d+\.\d+/g, ' ').match(CLAIM) || []).forEach((t) => add(num(t), 'policy ' + p.id)));
    Object.values(res.facts).forEach((v) => add(v, 'calculated from the record'));
    const sections = new Set(res.retrieved.map((p) => p.id));
    const refs = new Set((res.rec.note.match(/OT-\d+/g) || []));

    const parts = draft.split(CLAIM).map((t, i) => {
      if (i % 2 === 0) return { text: t };
      let source = null;
      if (t[0] === '§') source = sections.has(t) ? 'retrieved policy' : null;
      else if (t.startsWith('OT-')) source = refs.has(t) ? 'employee note' : null;
      else source = evidence.get(Math.round(num(t) * 100)) || null;
      return { text: t, claim: true, ok: !!source, source };
    });
    const claims = parts.filter((p) => p.claim);
    const bad = claims.filter((p) => !p.ok);
    return { parts, claims, total: claims.length, supported: claims.length - bad.length, unsupported: bad.map((p) => p.text), ok: bad.length === 0 };
  }

  // Replace a draft (from a live model, or a deliberately bad one) and let the guardrail decide.
  function applyDraft(res, text, source) {
    const g = verify(res, text);
    if (g.ok) { res.draft = text; res.grounding = g; res.source = source; res.blocked = null; }
    else { res.blocked = { text, grounding: g, source }; res.draft = res.scripted; res.grounding = verify(res); res.source = 'scripted'; }
    return res;
  }

  function hallucinate(res) {
    const r = res.rec;
    const bad = `${r.emp} submitted ${h(r.submitted + 3.5)}h this week and the exposure is $${usd(res.impact + 437)}. Under §9.4 this can be approved automatically, with no review needed.`;
    return applyDraft(res, bad, 'injected');
  }

  /* ---------- evaluation against the human-labelled answers ---------- */
  function score(flaggedIds, records) {
    const flagged = new Set(flaggedIds);
    let tp = 0, fp = 0, fn = 0;
    records.forEach((r) => {
      const isEx = !!r.gold, f = flagged.has(r.id);
      if (isEx && f) tp++; else if (!isEx && f) fp++; else if (isEx && !f) fn++;
    });
    return { tp, fp, fn, flagged: flagged.size, precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1), missed: records.filter((r) => r.gold && !flagged.has(r.id)) };
  }

  function retrievalHits(results) {
    const hit = results.filter((x) => x.governing.every((g) => x.retrieved.some((p) => p.id === g))).length;
    return { hit, total: results.length };
  }

  root.ENGINE = { scan, inspect, review, verify, applyDraft, hallucinate, retrieve, score, retrievalHits, TYPE_LABEL, h, usd };
})(typeof window !== 'undefined' ? window : globalThis);
