# Reconcile: a plain-language guide

This guide explains the demo without assuming any technical background: what problem it
solves, what happens on each screen, what is working behind the scenes, and how to talk about
it in an interview.

## 1. Start it

```bash
node server.js
```

Then open http://localhost:4173 in your browser. Leave the terminal window open while you
present; closing it stops the app. No internet connection is needed.

Controls: `Enter` or `→` goes to the next step, `←` goes back, `N` opens presenter notes.

## 2. The problem, in one paragraph

A company called Meridian Field Services (invented for this demo) has 100 people working on
client sites. Each week, three different computer systems record the same work:

| System | What it records | Who fills it in |
|---|---|---|
| Timekeeping | Hours the employee says they worked | The employee |
| Client approval | Hours the client agreed to pay for | The client's representative |
| ERP billing | Hours finance actually invoiced, and at what rate | The finance team |

These three should match. Often they do not: someone works overtime, a client disputes two
hours, travel time is billed at half rate, a timesheet is entered twice. Today a person opens
all three in Excel and compares them line by line. That takes about 40 hours a month, and
mistakes that slip through cost money: the company overpays staff, or under-bills or
over-bills a client.

**The goal:** let software do the comparing and the explaining, and let people spend their time
only on the handful of cases that need a decision.

## 3. The main idea

Most of this job does not need AI. Comparing two numbers is something ordinary software does
perfectly. AI is only useful for the part that involves *reading and judgement*: understanding
a note the employee wrote, and working out which company rule applies.

So the system is built in layers, each one doing only what it is good at:

1. **Ordinary software** compares the numbers.
2. **A search tool** finds the right company rule.
3. **An AI model** writes a short explanation.
4. **A checker** makes sure the AI did not invent anything.
5. **A person** makes the final decision.

That ordering is the point of the whole demo. Step 4 and step 5 are what make it safe.

## 4. What happens on each screen

Pick a story on the first screen. "Overtime on a verbal OK" is the best one to learn with,
because it uses every step. In that story, Mateo worked 44 hours and wrote that his manager
"said it was fine to stay".

### Stage 1: Understand the problem and build a small test

**Step 1. Fill in a timesheet.** You play the employee. You choose a name and project, type
hours for each day, and can add a note. Nothing clever happens here. It shows where the data
comes from.

**Step 2. Compare three systems.** You see the three versions of the week side by side. You
can change the approved hours or the billed hours to create a disagreement. A box turns amber
when it no longer matches.

**Step 3. Run the checks.** The software asks six yes-or-no questions, for example "Is the
week 40 hours or less?" and "Do billed hours equal approved hours?" Each gets a green tick or
an amber warning. For Mateo, one check fails: he is over 40 hours.

This step uses no AI. It can tell that something is wrong. It cannot tell whether the overtime
was allowed, because that depends on the note and the company's rules.

### Stage 2: Build the AI agent

**Step 4. Look up the policy.** Before answering, the system searches the company handbook
(12 short rules) and pulls out the three most relevant ones. For Mateo it finds the overtime
rule, which says overtime needs written approval and that verbal approval is not enough. You
can type your own question in the box and watch the results change.

**Step 5. Explain and prove it.** The agent writes a short finding, something like: "Mateo
logged 44 hours, 4 over the 40-hour limit, with no approval reference. A verbal go-ahead is
not sufficient under rule 3.1. Exposure: $368."

Then a separate checker goes through that text. Every number and every rule reference is
underlined and traced back to where it came from: the timesheet, the handbook, or a
calculation. The list on the right shows the source of each one.

Press **Make the AI lie**. The explanation is swapped for one with invented numbers and a
rule that does not exist. The checker finds nothing to back them up, marks them red, and
blocks the draft so it never reaches a person.

### Stage 3: Turn it into a full workflow

**Step 6. Size the money.** Hours in question times the hourly rate gives a dollar figure
(4 hours × $92 = $368). The company's own rule then decides who handles it: $500 or less
goes to the project manager, more than that goes to the Finance Controller.

**Step 7. Human review.** You play the reviewer. You see the finding, the suggested action,
and can add a comment before approving or sending it back. The software recommends; the
person decides.

**Step 8. Report and audit trail.** A timeline lists everything that happened to this
timesheet, with times: who submitted it, which checks failed, which rules were looked up,
what the agent concluded, what the reviewer decided. You can download it as a spreadsheet
file.

### Stage 4: Scale it up

**Step 9. Run the whole week.** The same steps run on all 38 timesheets at once. Each square
is one timesheet. Light green passed every check, dark green was flagged and then explained
by a rule, amber needs a person. Result: 26 need no human time, 12 go to people.

**Step 10. Value and next teams.** Sliders estimate the yearly saving. Buttons show how many
of the same building blocks could be reused for supplier invoices, expense claims, or work
orders.

## 5. The technical terms, translated

| Term you may hear | What it means here |
|---|---|
| Automation / rules | Ordinary software following fixed instructions. Always gives the same answer. Step 3. |
| LLM (large language model) | The kind of AI that reads and writes text, such as Claude or ChatGPT. Step 5. |
| GenAI | Any AI that produces new text. The written finding in step 5 is the GenAI part. |
| RAG (retrieval-augmented generation) | "Look it up before you answer." The AI is given the relevant company rules to read, instead of relying on memory. Step 4. |
| Grounding | Requiring every statement to be backed by a source. Step 5, right-hand list. |
| Hallucination | When an AI states something confidently that is not true or not in its sources. The "Make the AI lie" button shows one being caught. |
| Agent | AI that carries out a task in several steps using tools (search the handbook, check a register, write a finding), not just answering one question. |
| Agentic workflow | Several such steps and a human joined into one process. Stages 2 and 3 together. |
| Human in the loop | A person must approve before anything final happens. Step 7. |
| Audit trail | A written record of every action, so decisions can be checked later. Step 8. |
| Precision | Of the items the system flagged, how many were real problems. |
| Recall | Of all the real problems, how many the system found. |
| Evaluation | Comparing the system's answers with correct answers a person wrote down beforehand. Step 9. |

## 6. What is working for real, and what is simulated

Being clear about this in the interview is a strength.

**Works for real, every time you click:**

- The six checks in step 3.
- The handbook search in step 4. It uses a standard keyword-ranking method called BM25.
- The overtime register lookup (used in the "borrowed approval number" story).
- The fact-checker in step 5. It reads the text and verifies each number and rule reference.
- The dollar calculation and routing in step 6.
- The precision and recall numbers in step 9, measured against answers I labelled by hand.

**Simulated:**

- **The wording of the finding.** By default it comes from a template, not a live AI, so the
  demo cannot fail on a bad connection. The top bar says "Offline · scripted findings". If you
  add an API key, Claude writes it instead and the same checker judges the result. I could not
  test that path, so try it beforehand or stay offline.
- **The three systems.** They are dummy records, not connections to real software.
- **Sending results to payroll.** Nothing is actually written anywhere.

## 7. How this solves the business problem

| Problem today | What the system does about it |
|---|---|
| 40 hours a month comparing spreadsheets | Software compares all three systems in seconds |
| Reviewers check every line | Only 12 of 38 timesheets reach a person in the sample week |
| Rules alone raise false alarms (6 of 18 in the sample) | The agent reads the note and the policy and clears the ones that are fine |
| Errors slip through and cost money | $10,141 of questionable hours flagged in one sample week |
| "We don't trust AI" | Every claim is traced to a source, made-up answers are blocked, a person approves |
| "How do we prove what happened?" | Every step is logged with a time |
| "Will this only work for timesheets?" | 11 of 13 building blocks carry over to supplier invoices |

The yearly figure on step 10 (about $172,000 with the default sliders) has two parts. Around
$22,000 is staff time saved. The rest assumes 10% of the flagged money is a real loss, scaled
up from 35 people to 100 and from one week to 52. That is an assumption, and the honest way
to present it is as something a pilot would test.

## 8. How it maps to the four IG Labs stages

| IG Labs stage | Where it is in the demo | What you are showing |
|---|---|---|
| 1. Design and prototype | Steps 1 to 3 | You understand the problem, decide where AI is and is not needed, and prove the idea with a simple test |
| 2. Build and deploy agents | Steps 4 and 5 | An agent that does one specific job and can be checked |
| 3. Agentic workflows | Steps 6 to 8 | Several steps, a rule-based hand-off, and a person joined into one process |
| 4. Agentic platforms | Steps 9 and 10 | The same process at scale, and what could be reused elsewhere |

Stage 4 is a plan, not something built. The list at the bottom of step 10 separates what the
demo proves from what would still need engineering, such as real system connections and
access control.

## 9. A suggested five-minute walkthrough

1. **Home.** "A company spends 40 hours a month checking timesheets across three systems. I
   built the fix as something you can click through."
2. **Steps 1 to 3** with "Overtime on a verbal OK". "Most of this is ordinary automation. The
   checks find the problem but cannot judge it."
3. **Step 4.** "So the agent looks up the company's rule first." Type "travel time" to show
   the search is live.
4. **Step 5.** "It explains, and every figure is traced to a source." Press Make the AI lie.
   "A wrong answer is stopped before anyone reads it."
5. **Steps 6 to 8.** "Money decides who owns it, a person approves, and everything is logged."
6. **Step 9.** "Same steps, whole week: 26 need nobody, 12 go to people, no false alarms."
7. **Step 10.** "Roughly this much a year, on assumptions I would test in a pilot. Most of
   the parts carry over to the next department."

Other stories worth a minute each if asked: "A borrowed approval number" (the agent checks a
register instead of trusting the note) and "Travel days" (the policy clears something that
looks like an error).

## 10. The files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The screens you click through |
| `engine.js` | The working logic: checks, search, fact-checker, scoring |
| `data.js` | The dummy timesheets, the policy handbook, the overtime register |
| `server.js` | Starts the app on your computer; also holds the optional live-AI connection |
