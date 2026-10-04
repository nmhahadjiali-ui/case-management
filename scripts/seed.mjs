// =============================================================================
// DEMO / DEVELOPMENT SEED DATA — never run against production.
//
//   npm run seed          create demo users and sample records (only if no cases exist)
//   npm run seed -- --reset   delete ALL case data and demo users, then seed again
//
// Demo accounts all use the @demo.local domain and the password below.
// The script refuses to run against a non-local Supabase URL unless
// ALLOW_REMOTE_SEED=true is set.
// Dates are generated relative to today so the dashboard always looks current.
// =============================================================================
import { createClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || "UTC"
const RESET = process.argv.includes("--reset")
export const DEMO_PASSWORD = "Demo1234!"

if (!URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.example).")
  process.exit(1)
}
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(URL)
if (!isLocal && process.env.ALLOW_REMOTE_SEED !== "true") {
  console.error(`Refusing to seed demo data into ${URL}. Set ALLOW_REMOTE_SEED=true to override.`)
  process.exit(1)
}

const db = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function must({ data, error }, what) {
  if (error) {
    console.error(`✗ ${what}:`, error.message)
    process.exit(1)
  }
  return data
}

const pad = (n) => String(n).padStart(2, "0")

function todayKeyInTz() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value])
  )
  return `${p.year}-${p.month}-${p.day}`
}

const TODAY = todayKeyInTz()

/** YYYY-MM-DD, `offset` days from today */
function day(offset) {
  const [y, m, d] = TODAY.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + offset))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** ISO instant for a wall-clock time in the app time zone. */
function at(offsetDays, time) {
  const [y, m, d] = day(offsetDays).split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const wall = Date.UTC(y, m - 1, d, hh, mm)
  const offsetAt = (t) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
      }).formatToParts(new Date(t)).map((x) => [x.type, x.value])
    )
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t
  }
  let guess = wall - offsetAt(wall)
  guess = wall - offsetAt(guess)
  return new Date(guess).toISOString()
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
async function reset() {
  console.log("Resetting demo data…")
  const all = "00000000-0000-0000-0000-000000000000"
  for (const table of [
    "notifications", "activity_logs", "event_participants", "events", "tasks", "case_documents",
    "case_notes", "case_tags", "case_parties", "cases", "person_notes", "people", "tags", "locations", "departments",
  ]) {
    const key = table === "case_tags" ? "case_id" : table === "event_participants" ? "event_id" : "id"
    must(await db.from(table).delete().neq(key, all), `clear ${table}`)
  }
  const { data: files } = await db.storage.from("case-documents").list("", { limit: 1000 })
  for (const folder of files ?? []) {
    const { data: inner } = await db.storage.from("case-documents").list(folder.name, { limit: 1000 })
    if (inner?.length) await db.storage.from("case-documents").remove(inner.map((f) => `${folder.name}/${f.name}`))
  }
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 })
  for (const u of users?.users ?? []) {
    if (u.email?.endsWith("@demo.local")) await db.auth.admin.deleteUser(u.id)
  }
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  const { count } = await db.from("cases").select("id", { count: "exact", head: true })
  if (count && !RESET) {
    console.log(`Database already has ${count} cases. Use "npm run seed -- --reset" to start over.`)
    return
  }
  if (RESET) await reset()

  // --- Users -----------------------------------------------------------------
  const demoUsers = [
    { email: "admin@demo.local", full_name: "Amina Santos", role: "administrator" },
    { email: "manager@demo.local", full_name: "Rafael Mendoza", role: "case_manager" },
    { email: "staff@demo.local", full_name: "Leah Villanueva", role: "staff" },
    { email: "clerk@demo.local", full_name: "Omar Haddad", role: "staff" },
    { email: "viewer@demo.local", full_name: "Grace Lim", role: "viewer" },
  ]
  const users = {}
  for (const u of demoUsers) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    })
    if (error) {
      console.error(`✗ create user ${u.email}:`, error.message)
      process.exit(1)
    }
    must(await db.from("profiles").update({ role: u.role }).eq("id", data.user.id), `role for ${u.email}`)
    users[u.role === "staff" && users.staff ? "clerk" : u.role] = data.user.id
  }
  const { administrator: admin, case_manager: manager, staff, clerk } = users
  console.log("✓ users")

  // --- Reference data --------------------------------------------------------
  const departments = must(
    await db.from("departments").insert([
      { name: "Civil Division" }, { name: "Criminal Division" }, { name: "Family Division" }, { name: "Records Section" },
    ]).select(),
    "departments"
  )
  const dept = Object.fromEntries(departments.map((d) => [d.name.split(" ")[0].toLowerCase(), d.id]))
  must(await db.from("profiles").update({ department_id: dept.civil }).in("id", [manager, staff]), "staff departments")
  must(await db.from("profiles").update({ department_id: dept.family }).eq("id", clerk), "clerk department")

  const locations = must(
    await db.from("locations").insert([
      { name: "Hall of Justice — Courtroom A", address: "2/F Hall of Justice, Rizal Avenue" },
      { name: "Hall of Justice — Courtroom B", address: "3/F Hall of Justice, Rizal Avenue" },
      { name: "Mediation Room 1", address: "Ground Floor, Annex Building" },
      { name: "Main Office Conference Room", address: "Ground Floor, Main Building" },
    ]).select(),
    "locations"
  )
  const loc = locations.map((l) => l.id)

  const tags = must(
    await db.from("tags").insert([{ name: "mediation" }, { name: "appeal" }, { name: "pro-bono" }, { name: "urgent-review" }]).select(),
    "tags"
  )
  const types = must(await db.from("case_types").select("id, slug"), "case types")
  const type = Object.fromEntries(types.map((t) => [t.slug, t.id]))
  console.log("✓ reference data")

  // --- People ----------------------------------------------------------------
  const peopleRows = [
    ["Maria", "Reyes", "Cruz", "complainant", "female", "1985-03-14", "12 Mabini Street, Poblacion", "+63 917 555 0101"],
    ["Jose", "Santos", "Dela Rosa", "defendant", "male", "1979-11-02", "88 Bonifacio Avenue, San Isidro", "+63 918 555 0102"],
    ["Fatima", null, "Abdullah", "complainant", "female", "1990-07-21", "5 Sampaguita Lane, Rosary Heights", "+63 919 555 0103"],
    ["Ibrahim", "K.", "Malik", "defendant", "male", "1975-01-30", "41 Quezon Boulevard, Centro", "+63 920 555 0104"],
    ["Ana", "Lopez", "Garcia", "complainant", "female", "1968-09-09", "3 Acacia Drive, Villa Verde", "+63 921 555 0105"],
    ["Roberto", null, "Tan", "defendant", "male", "1982-05-17", "19 Narra Street, Kalawag", "+63 922 555 0106"],
    ["Noraida", "S.", "Usman", "complainant", "female", "1993-12-01", "77 Magsaysay Road, Datu Plaza", "+63 923 555 0107"],
    ["Carlos", "M.", "Bautista", "defendant", "male", "1988-04-25", "60 Del Pilar Street, Poblacion", "+63 924 555 0108"],
    ["Elena", null, "Ramos", "witness", "female", "1972-06-11", "22 Luna Street, San Roque", "+63 925 555 0109"],
    ["Hassan", "A.", "Pendatun", "witness", "male", "1965-02-08", "9 Sinsuat Avenue, Rosary Heights", "+63 926 555 0110"],
    ["Teresa", "V.", "Navarro", "lawyer", "female", "1980-08-19", "Navarro Law Office, 14 Rizal Avenue", "+63 927 555 0111"],
    ["Miguel", null, "Fernandez", "lawyer", "male", "1977-10-05", "Fernandez & Associates, 31 Quezon Blvd", "+63 928 555 0112"],
    ["Aisha", "R.", "Mangudadatu", "complainant", "female", "1995-01-15", "15 Gov. Gutierrez Avenue", "+63 929 555 0113"],
    ["Daniel", "P.", "Aquino", "defendant", "male", "1984-03-03", "102 Jose Lim Street, Kalanganan", "+63 930 555 0114"],
    ["Rosa", null, "Villareal", "representative", "female", "1970-12-24", "8 Barangay Hall Road, Tamontaka", "+63 931 555 0115"],
    ["Samir", "B.", "Ali", "complainant", "male", "1987-07-07", "56 Don Rufino Street, Poblacion", "+63 932 555 0116"],
    ["Liza", "G.", "Pascual", "defendant", "female", "1991-09-28", "27 Mabuhay Street, Bagua", "+63 933 555 0117"],
    ["Benjamin", null, "Ocampo", "witness", "male", "1958-04-12", "4 Old Capitol Road, Centro", "+63 934 555 0118"],
  ]
  const people = must(
    await db.from("people").insert(
      peopleRows.map(([first_name, middle_name, last_name, primary_role, gender, date_of_birth, address, contact_number]) => ({
        first_name, middle_name, last_name, primary_role, gender, date_of_birth, address, contact_number,
        email: `${first_name}.${last_name}`.toLowerCase().replace(/\s+/g, "") + "@example.com",
        created_by: staff,
      }))
    ).select("id, full_name"),
    "people"
  )
  const P = people.map((p) => p.id)
  console.log(`✓ ${people.length} people`)

  // --- Cases -----------------------------------------------------------------
  const year = TODAY.slice(0, 4)
  const caseSpecs = [
    // [title, type, status, priority, filedOffset, deadlineOffset, assignee, complainant, defendant, extras]
    ["Breach of lease agreement", "civil", "active", "high", -40, 5, staff, 0, 1, [[8, "witness"], [10, "lawyer"]]],
    ["Recovery of unpaid loan", "civil", "hearing", "normal", -75, 12, manager, 2, 3, [[11, "lawyer"]]],
    ["Petition for partition of inherited land", "inheritance", "pending", "normal", -120, -3, clerk, 4, 5, [[14, "representative"]]],
    ["Petition for dissolution of marriage", "divorce", "active", "normal", -30, 20, clerk, 6, 7, []],
    ["Theft of farm equipment", "criminal", "hearing", "urgent", -15, 2, manager, 12, 13, [[9, "witness"], [17, "witness"]]],
    ["Boundary dispute between adjoining lots", "land", "new", "normal", -2, 30, staff, 15, 16, []],
    ["Custody and support of minor children", "family", "active", "high", -55, 6, clerk, 0, 3, [[10, "lawyer"]]],
    ["Unlawful detainer — residential unit", "property", "on_hold", "low", -95, -10, staff, 2, 5, []],
    ["Administrative complaint — delayed permit", "administrative", "pending", "normal", -20, 4, manager, 15, 13, []],
    ["Claim for damages from vehicle collision", "civil", "closed", "normal", -200, -60, staff, 4, 7, [[17, "witness"]]],
    ["Estate settlement of the late R. Usman", "inheritance", "active", "normal", -65, 14, clerk, 6, 16, [[9, "witness"]]],
    ["Oral defamation", "criminal", "new", "high", -1, 10, null, 12, 1, []],
    ["Annulment of deed of sale", "property", "active", "urgent", -48, -1, manager, 15, 3, [[11, "lawyer"]]],
    ["Support for elderly parent", "family", "closed", "low", -160, -40, clerk, 0, 13, []],
    ["Encroachment on agricultural land", "land", "pending", "high", -35, 3, staff, 2, 7, [[17, "witness"]]],
    ["Collection of sum of money", "civil", "archived", "low", -320, -200, staff, 4, 5, []],
    ["Petition for change of name", "other", "new", "low", 0, 45, null, 6, null, [[14, "representative"]]],
  ]
  const caseRows = caseSpecs.map(([title, t, status, priority, filed, deadline, assignee], i) => ({
    case_number: `${year}-${String(i + 1).padStart(3, "0")}`,
    title,
    description: `${title}. Filed for adjudication and assigned for appropriate action. Parties have been notified of the filing.`,
    case_type_id: type[t],
    status,
    priority,
    date_filed: day(filed),
    deadline: day(deadline),
    resolution_date: status === "closed" || status === "archived" ? day(deadline) : null,
    assigned_to: assignee,
    department_id: t === "criminal" ? dept.criminal : ["family", "divorce"].includes(t) ? dept.family : dept.civil,
    location_id: loc[i % 2],
    created_by: i % 3 === 0 ? manager : staff,
  }))
  const cases = must(await db.from("cases").insert(caseRows).select("id, case_number, status, location_id"), "cases")
  console.log(`✓ ${cases.length} cases`)

  // Parties
  const parties = []
  caseSpecs.forEach(([, , , , , , , c, d, extras], i) => {
    parties.push({ case_id: cases[i].id, person_id: P[c], role: "complainant" })
    if (d !== null) parties.push({ case_id: cases[i].id, person_id: P[d], role: "defendant" })
    for (const [p, role] of extras) parties.push({ case_id: cases[i].id, person_id: P[p], role })
  })
  must(await db.from("case_parties").insert(parties), "case parties")

  // Tags
  must(
    await db.from("case_tags").insert([
      { case_id: cases[0].id, tag_id: tags[0].id },
      { case_id: cases[2].id, tag_id: tags[0].id },
      { case_id: cases[4].id, tag_id: tags[3].id },
      { case_id: cases[9].id, tag_id: tags[1].id },
      { case_id: cases[12].id, tag_id: tags[3].id },
      { case_id: cases[16].id, tag_id: tags[2].id },
    ]),
    "case tags"
  )
  console.log("✓ parties and tags")

  // --- Events ----------------------------------------------------------------
  const locName = Object.fromEntries(locations.map((l) => [l.id, l.name]))
  const hearing = (ci, offset, time, subtype, status = "scheduled") => ({
    title: `${subtype} — ${cases[ci].case_number}`,
    event_type: "hearing",
    subtype,
    status,
    starts_at: at(offset, time),
    ends_at: at(offset, `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}${time.slice(2)}`),
    location: locName[cases[ci].location_id],
    case_id: cases[ci].id,
    reminder_minutes: 1440,
    created_by: manager,
  })
  // Bulk inserts need identical keys on every row (missing keys become NULL, not the default).
  const eventDefaults = { subtype: null, ends_at: null, all_day: false, location: null, case_id: null, reminder_minutes: null, description: null }
  const events = must(
    await db.from("events").insert([
      hearing(4, 0, "09:00", "Arraignment"),
      hearing(1, 1, "10:30", "Pre-trial"),
      hearing(0, 3, "14:00", "Initial hearing"),
      hearing(6, 5, "09:30", "Hearing on custody"),
      hearing(12, 6, "13:30", "Pre-trial"),
      hearing(10, 12, "10:00", "Presentation of evidence"),
      hearing(3, 18, "09:00", "Initial hearing"),
      hearing(1, -12, "10:00", "Mediation", "completed"),
      hearing(9, -70, "09:00", "Promulgation", "completed"),
      hearing(2, -5, "14:00", "Ocular inspection", "postponed"),
      { title: "Preliminary conference — parties and counsel", event_type: "conference", status: "scheduled", starts_at: at(0, "13:00"), ends_at: at(0, "14:00"), location: "Main Office Conference Room", case_id: cases[0].id, created_by: staff },
      { title: "Submit position paper", event_type: "deadline", status: "scheduled", starts_at: at(0, "16:00"), all_day: false, case_id: cases[8].id, created_by: manager, reminder_minutes: 120 },
      { title: "Mediation conference", event_type: "conference", status: "scheduled", starts_at: at(2, "10:00"), ends_at: at(2, "11:30"), location: "Mediation Room 1", case_id: cases[2].id, created_by: clerk },
      { title: "Client consultation — M. Reyes Cruz", event_type: "appointment", status: "scheduled", starts_at: at(1, "15:00"), ends_at: at(1, "15:45"), location: "Main Office Conference Room", case_id: cases[6].id, created_by: clerk },
      { title: "Weekly case review meeting", event_type: "meeting", status: "scheduled", starts_at: at(4, "08:30"), ends_at: at(4, "09:30"), location: "Main Office Conference Room", created_by: manager },
      { title: "Deadline: answer to complaint", event_type: "deadline", status: "scheduled", starts_at: at(7, "00:00"), all_day: true, case_id: cases[5].id, created_by: staff },
      { title: "Records inventory", event_type: "other", status: "scheduled", starts_at: at(9, "13:00"), ends_at: at(9, "16:00"), location: "Records Section", created_by: admin },
      { title: "Site visit — disputed boundary", event_type: "appointment", status: "scheduled", starts_at: at(-2, "09:00"), ends_at: at(-2, "11:00"), location: "Lot 14, Barangay Bagua", case_id: cases[14].id, created_by: staff },
    ].map((e) => ({ ...eventDefaults, ...e }))).select("id, case_id"),
    "events"
  )
  must(
    await db.from("event_participants").insert([
      { event_id: events[0].id, person_id: P[12] }, { event_id: events[0].id, person_id: P[13] },
      { event_id: events[1].id, person_id: P[2] }, { event_id: events[1].id, person_id: P[3] }, { event_id: events[1].id, person_id: P[11] },
      { event_id: events[10].id, person_id: P[0] }, { event_id: events[10].id, person_id: P[1] }, { event_id: events[10].id, person_id: P[10] },
    ]),
    "event participants"
  )
  console.log(`✓ ${events.length} events`)

  // --- Tasks -----------------------------------------------------------------
  const task = (title, ci, due, priority, assignee, status = "pending", description = null) => ({
    title, description, case_id: ci === null ? null : cases[ci].id, due_date: due === null ? null : day(due),
    priority, assigned_to: assignee, status, created_by: manager,
  })
  must(
    await db.from("tasks").insert([
      task("Prepare hearing brief", 4, 0, "urgent", staff, "in_progress", "Summarise evidence and witness statements for the arraignment."),
      task("Serve summons to defendant", 5, 2, "high", clerk),
      task("Verify land title documents", 14, -2, "high", staff, "pending", "Request certified true copies from the Registry of Deeds."),
      task("Draft notice of hearing", 1, 0, "medium", clerk),
      task("Update case calendar for next month", null, 5, "low", staff),
      task("Review position paper", 8, 0, "high", manager),
      task("Request barangay certification", 2, -5, "medium", clerk),
      task("File compliance report", 12, 1, "urgent", manager, "in_progress"),
      task("Schedule mediation with both parties", 0, 3, "medium", staff),
      task("Archive closed case records", 9, -20, "low", clerk, "completed"),
      task("Prepare custody evaluation request", 6, 4, "high", clerk),
      task("Encode new complaint", 11, 1, "medium", staff),
      task("Send hearing reminders to witnesses", 4, -1, "medium", staff, "completed"),
      task("Compile exhibits for evidence presentation", 10, 9, "medium", clerk),
      task("Check status of appeal", 9, 6, "low", manager),
      task("Return calls from counsel", null, 0, "low", staff, "completed"),
    ]),
    "tasks"
  )
  console.log("✓ tasks")

  // --- Notes -----------------------------------------------------------------
  must(
    await db.from("case_notes").insert([
      { case_id: cases[0].id, body: "Complainant submitted copies of the lease contract and receipts for the last six months.", created_by: staff },
      { case_id: cases[0].id, body: "Defendant's counsel requested a 10-day extension to file an answer.", created_by: manager },
      { case_id: cases[4].id, body: "Two witnesses confirmed availability for the arraignment.", created_by: staff },
      { case_id: cases[2].id, body: "Ocular inspection postponed due to weather. To be rescheduled after mediation.", created_by: clerk },
    ]),
    "case notes"
  )
  must(
    await db.from("person_notes").insert([
      { person_id: P[0], body: "Prefers to be contacted by phone in the morning.", created_by: staff },
      { person_id: P[10], body: "Counsel of record for two active cases.", created_by: manager },
    ]),
    "person notes"
  )

  // --- A few extra notifications so every account has something to see -------
  const extra = []
  for (const uid of [admin, manager, staff, clerk]) {
    extra.push(
      { user_id: uid, title: "Welcome to the Case Management System", message: "This is demo data. Explore the dashboard, cases and calendar.", type: "system", link: "/dashboard" },
    )
  }
  extra.push({ user_id: staff, title: "Upcoming hearing", message: `Arraignment for case ${cases[4].case_number} today at 9:00 AM`, type: "hearing", related_case_id: cases[4].id, link: `/cases/${cases[4].id}` })
  extra.push({ user_id: manager, title: "Case status changed", message: `Case ${cases[1].case_number} is now in hearing`, type: "case", related_case_id: cases[1].id, link: `/cases/${cases[1].id}`, is_read: true })
  must(
    await db.from("notifications").insert(extra.map((n) => ({ related_case_id: null, is_read: false, ...n }))),
    "notifications"
  )

  console.log("\nDemo data ready. Sign in with any of these accounts (password: " + DEMO_PASSWORD + "):")
  for (const u of demoUsers) console.log(`  ${u.email.padEnd(22)} ${u.role}`)
}

await seed()
