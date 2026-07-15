// Demo data used to auto-populate the workbook on first run, so the app works
// out of the box with `npm run dev` / `npm start` (no separate seed step).
//
// Password hashes are pre-computed bcrypt hashes (cost 10) so this module stays
// synchronous:
//   admin@shuttle.pro     -> admin123
//   organizer@shuttle.pro -> organizer123
//   player@shuttle.pro    -> player123
import { v4 as uuidv4 } from "uuid";
import { ROLES, DEFAULT_POINTS_CONFIG } from "./schema.js";

const gid = (p) => `${p}-${uuidv4().slice(0, 8)}`;
const now = () => new Date().toISOString();

const HASHES = {
  admin: "$2a$10$wPEiXpytFx0I77xB6IDguO7rPwcVypx5tVSQb/v/cO5mnXHgbp9y2",
  org: "$2a$10$SnEfh4OTiqTsouBe9thtROaSujqV2C1Va3JhGvHGAEQspa2axFmaW",
  player: "$2a$10$uwdK/qN1CfrtX0nVlv4zoe5twLpBRizuHG4igNN.UHxUdOxfpt/AW",
};

const CLUBS = [
  { name: "Smash Masters", city: "Mumbai", state: "Maharashtra", contactPerson: "R. Iyer", contactNumber: "9820011111", members: 42 },
  { name: "Net Ninjas", city: "Bengaluru", state: "Karnataka", contactPerson: "K. Rao", contactNumber: "9845022222", members: 35 },
  { name: "Feather Force", city: "Delhi", state: "Delhi", contactPerson: "A. Khan", contactNumber: "9811033333", members: 50 },
  { name: "Rally Kings", city: "Hyderabad", state: "Telangana", contactPerson: "S. Reddy", contactNumber: "9701044444", members: 28 },
];

const FIRST = ["Aarav", "Vivaan", "Aditya", "Diya", "Ananya", "Ishaan", "Saanvi", "Kabir", "Myra", "Reyansh", "Anika", "Vihaan", "Kiara", "Arjun", "Sara", "Rohan"];
const LAST = ["Sharma", "Patel", "Reddy", "Nair", "Iyer", "Khan", "Gupta", "Mehta", "Rao", "Das"];
const SKILL = ["Beginner", "Intermediate", "Advanced", "Professional"];

function buildPlayers(count) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const club = CLUBS[i % CLUBS.length];
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 3) % LAST.length];
    players.push({
      id: gid("PL"),
      firstName: first,
      lastName: last,
      gender: i % 2 === 0 ? "Male" : "Female",
      age: 18 + (i % 20),
      mobile: `90000${String(10000 + i).slice(-5)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      city: club.city,
      state: club.state,
      club: club.name,
      skillLevel: SKILL[i % SKILL.length],
      photo: "",
      registrationDate: now(),
      currentPoints: 0,
      currentRanking: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      titlesWon: 0,
    });
  }
  return players;
}

// Returns a { sheetName: rows[] } map used to build the initial workbook.
export function buildSeedData() {
  const players = buildPlayers(16);

  const admin = { id: gid("USR"), email: "admin@shuttle.pro", passwordHash: HASHES.admin, name: "System Admin", role: ROLES.SUPER_ADMIN, playerId: "", resetToken: "", resetTokenExpiry: "", createdAt: now() };
  const organizer = { id: gid("USR"), email: "organizer@shuttle.pro", passwordHash: HASHES.org, name: "Tournament Organizer", role: ROLES.ORGANIZER, playerId: "", resetToken: "", resetTokenExpiry: "", createdAt: now() };
  const playerUser = { id: gid("USR"), email: "player@shuttle.pro", passwordHash: HASHES.player, name: `${players[0].firstName} ${players[0].lastName}`, role: ROLES.PLAYER, playerId: players[0].id, resetToken: "", resetTokenExpiry: "", createdAt: now() };

  const tournaments = [
    { id: gid("TRN"), name: "Summer Open 2026", description: "Annual open singles championship.", venue: "National Stadium, Mumbai", startDate: "2026-08-01", endDate: "2026-08-05", organizer: organizer.name, organizerId: organizer.id, category: "Singles", format: "Knockout", status: "Registration Open", createdAt: now() },
    { id: gid("TRN"), name: "City League 2026", description: "Round-robin league across clubs.", venue: "Indoor Arena, Bengaluru", startDate: "2026-09-10", endDate: "2026-09-20", organizer: organizer.name, organizerId: organizer.id, category: "Singles", format: "Round Robin", status: "Draft", createdAt: now() },
  ];

  const registrations = players.slice(0, 8).map((p) => ({
    id: gid("REG"), tournamentId: tournaments[0].id, playerId: p.id, teamId: "", type: "Singles", status: "Approved", registeredAt: now(),
  }));

  return {
    Users: [admin, organizer, playerUser],
    Players: players,
    Clubs: CLUBS.map((c) => ({ id: gid("CLB"), address: "", ...c })),
    Tournaments: tournaments,
    Teams: [],
    Registrations: registrations,
    Matches: [],
    Rankings: [],
    Points_Config: DEFAULT_POINTS_CONFIG.map((d) => ({ ...d })),
    Notifications: [],
    Audit_Log: [{ id: gid("LOG"), userId: admin.id, userName: admin.name, action: "SEED", entity: "System", details: "Database initialized", timestamp: now() }],
  };
}
