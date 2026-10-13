/* Dummy data for the demo. Every person, client and number here is invented. */
(function (root) {
  const WEEK = 'Week ending 4 Oct 2026';

  const RATE_CARD = {
    'Field Technician': 92, 'Electrician': 118, 'HVAC Tech': 104, 'Site Supervisor': 135,
    'Controls Engineer': 148, 'Pipefitter': 110, 'Safety Officer': 98,
    'Project Coordinator': 84, 'Welder': 112, 'Estimator': 96,
  };

  const PROJECTS = {
    Harbor: 'Harborview Hospital retrofit',
    Kestrel: 'Kestrel Logistics DC',
    Alder: 'Alder Street Schools',
    Tidal: 'Tidal Water Plant',
  };

  // [employee, role, project, submitted, approved, billed, billedRate|null, note, goldType|null]
  // goldType is the human-labelled answer: null = clean, otherwise the exception type.
  const ROWS = [
    ['Amara Okafor', 'Field Technician', 'Harbor', 40, 40, 40, null, '', null],
    ['Liam Chen', 'Field Technician', 'Harbor', 38, 38, 38, null, '', null],
    ['Sofia Reyes', 'Electrician', 'Kestrel', 40, 40, 40, null, '', null],
    ['Noah Patel', 'HVAC Tech', 'Alder', 36.25, 36, 36, null, '', null],
    ['Grace Kim', 'Site Supervisor', 'Harbor', 24, 24, 24, null, '', null],
    ['Grace Kim', 'Site Supervisor', 'Tidal', 22, 22, 22, null, 'Stayed late Wed and Thu for the clarifier pump failure. Dana Whitfield signed off, ref OT-2291.', null],
    ['Mateo Alvarez', 'Field Technician', 'Kestrel', 44, 44, 44, null, 'Dock leveller install ran long. Marcus said it was fine to stay.', 'OVERTIME'],
    ['Priya Nair', 'Controls Engineer', 'Kestrel', 40, 40, 40, null, '', null],
    ['Jonas Weber', 'Pipefitter', 'Tidal', 40, 32, 32, null, 'Friday valve replacement, client rep was off site so no sign-off yet.', 'HOURS'],
    ['Hana Sato', 'Safety Officer', 'Alder', 30, 30, 30, null, '', null],
    ['Omar Haddad', 'Electrician', 'Harbor', 40, 40, 44, null, '', 'BILLED'],
    ['Elena Rossi', 'Project Coordinator', 'Alder', 40, null, 0, null, '', 'MISSING_APPROVAL'],
    ['Tobias Lund', 'HVAC Tech', 'Harbor', 40, 40, 40, 114, '', 'RATE'],
    ['Chloe Martin', 'Field Technician', 'Kestrel', 32, 32, 32, null, '', null],
    ['Chloe Martin', 'Field Technician', 'Kestrel', 32, 32, 32, null, '', 'DUPLICATE'],
    ['Kwame Mensah', 'Welder', 'Tidal', 40, 40, 40, null, '', null],
    ['Isla Novak', 'Controls Engineer', 'Harbor', 18, 18, 18, null, '', null],
    ['Isla Novak', 'Controls Engineer', 'Kestrel', 20.25, 20, 20, null, '', null],
    ['Diego Santos', 'Pipefitter', 'Tidal', 40, 40, 36, null, 'Includes 8h travel to the Tidal site, Mon and Fri.', null],
    ['Mei Lin', 'Estimator', 'Alder', 16, 16, 16, null, '', null],
    ['Rafael Costa', 'Field Technician', 'Harbor', 42, 42, 42, null, 'Saturday commissioning, pre-approved, ref OT-2304.', 'OVERTIME'],
    ['Nora Berg', 'Electrician', 'Kestrel', 43, 43, 43, null, 'Saturday panel changeover, ref OT-2304.', null],
    ['Samir Khan', 'Site Supervisor', 'Tidal', 40, 40, 40, null, 'Includes 3h for Kestrel snag list, logged here because the Kestrel code was locked.', 'MISALLOCATION'],
    ['Ava Thompson', 'Field Technician', 'Alder', 40, 40, 40, null, '', null],
    ['Lukas Meyer', 'Electrician', 'Tidal', 39.75, 40, 40, null, '', null],
    ['Zara Ahmed', 'HVAC Tech', 'Kestrel', 40, 40, 40, null, '', null],
    ['Ben Carter', 'Pipefitter', 'Harbor', 36, 36, 36, null, '', null],
    ['Yuki Tanaka', 'Controls Engineer', 'Tidal', 40, 40, 40, null, '', null],
    ['Leila Farouk', 'Safety Officer', 'Harbor', 40, 40, 34, null, 'Client closed the site Thursday afternoon, 6h stand-by.', 'BILLED'],
    ['Henrik Olsen', 'Welder', 'Kestrel', 40, 40, 40, null, '', null],
    ['Carmen Diaz', 'Field Technician', 'Tidal', 41, 41, 41, null, '', 'OVERTIME'],
    ['Arjun Mehta', 'Estimator', 'Harbor', 24, 24, 24, null, '', null],
    ['Freya Lind', 'Project Coordinator', 'Kestrel', 40, 38, 38, null, 'Client disputed 2h of rework on the punch list.', 'HOURS'],
    ['Theo Grant', 'Electrician', 'Alder', 40, 40, 40, null, '', null],
    ['Ines Moreau', 'Field Technician', 'Harbor', 40, 40, 40, null, '', null],
    ['Dalia Rahman', 'HVAC Tech', 'Tidal', 40, 40, 40, null, '', null],
    ['Owen Price', 'Pipefitter', 'Alder', 38.5, 38.5, 38.5, null, '', null],
    ['Sana Qureshi', 'Site Supervisor', 'Kestrel', 40, 40, 40, 128, '', 'RATE'],
  ];

  const RECORDS = ROWS.map((r, i) => ({
    id: 'TS-' + (1001 + i),
    emp: r[0], role: r[1], project: r[2], projectName: PROJECTS[r[2]],
    submitted: r[3], approved: r[4], billed: r[5],
    rate: r[6] == null ? RATE_CARD[r[1]] : r[6], cardRate: RATE_CARD[r[1]],
    note: r[7], gold: r[8],
  }));

  // Overtime register: the system of record for written pre-approvals.
  const OT_REGISTER = [
    { ref: 'OT-2291', emp: 'Grace Kim', hours: 6, approver: 'Dana Whitfield' },
    { ref: 'OT-2304', emp: 'Nora Berg', hours: 3, approver: 'Marcus Bell' },
  ];

  // The policy the agent retrieves from. One chunk per section.
  const POLICY_NAME = 'Meridian Time & Billing Policy v3.2';
  const POLICY = [
    { id: '§2.1', title: 'Rounding and tolerance', text: 'Time is recorded in 15 minute increments. A difference of 0.25 hours or less between submitted hours and client approved hours is rounding variance and is accepted without review.' },
    { id: '§3.1', title: 'Overtime pre-approval', text: 'Hours above 40 in a week are overtime and require written pre-approval, recorded in the overtime register with an OT reference. Verbal approval is not sufficient. Overtime without a valid reference is held from payroll until a retroactive request is approved.' },
    { id: '§3.2', title: 'Overtime reference validity', text: 'An overtime reference is valid only for the employee, the week and the hours it was issued for. A reference issued to another employee does not cover the overtime.' },
    { id: '§4.1', title: 'Client approval of hours', text: 'Hours are billable only once approved by the client representative. Submitted hours above the client approved hours are not billable and are returned to the project manager for resolution.' },
    { id: '§4.2', title: 'Approval deadline', text: 'Timesheets must be approved within 3 business days of week end. A timesheet with no approval on file is unapproved: it is escalated to the project manager and excluded from the invoice run.' },
    { id: '§5.1', title: 'Invoiced hours', text: 'Invoiced hours billed in the ERP must equal the client approved hours, unless the travel rule in §5.2 or the stand-by rule in §5.3 applies. Billing more than approved is over-billing and must be corrected before the invoice is sent.' },
    { id: '§5.2', title: 'Travel time', text: 'Travel to site is billed at 50% of the travel hours. Worked hours are billed in full.' },
    { id: '§5.3', title: 'Stand-by time', text: 'When the client closes the site, stand-by hours are billable at the full rate and must be invoiced.' },
    { id: '§6.1', title: 'Rate card', text: 'The billing rate must match the contract rate card for the role. Any deviation from the rate card requires a signed rate change order.' },
    { id: '§7.1', title: 'Duplicate timesheets', text: 'Only one timesheet is allowed per employee, project and week. A duplicate timesheet is voided before payroll.' },
    { id: '§7.2', title: 'Project allocation', text: 'Hours must be logged against the project where the work was done. Hours logged to another project code must be transferred before invoicing.' },
    { id: '§8.1', title: 'Escalation threshold', text: 'A variance above $500 is escalated to the Finance Controller. A variance of $500 or less is resolved by the project manager.' },
  ];

  root.DEMO_DATA = { WEEK, RATE_CARD, PROJECTS, RECORDS, OT_REGISTER, POLICY, POLICY_NAME, HEADCOUNT: 100 };
})(typeof window !== 'undefined' ? window : globalThis);
