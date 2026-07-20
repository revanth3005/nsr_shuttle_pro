// Central definition of the Excel workbook: sheet names, columns and default
// seed rows. Keeping this in one place makes the storage layer reusable and
// keeps the "database design" in a single source of truth.

export const SHEETS = {
  Users: "Users",
  Players: "Players",
  Clubs: "Clubs",
  Tournaments: "Tournaments",
  Teams: "Teams",
  Registrations: "Registrations",
  Matches: "Matches",
  Rankings: "Rankings",
  Points_Config: "Points_Config",
  Notifications: "Notifications",
  Audit_Log: "Audit_Log",
};

// Column order for every sheet. The storage layer uses this to guarantee a
// stable header row even when rows are sparse.
export const COLUMNS = {
  Users: [
    "id", "email", "passwordHash", "name", "role", "playerId",
    "resetToken", "resetTokenExpiry", "createdAt",
  ],
  Players: [
    "id", "firstName", "lastName", "gender", "age", "mobile", "email",
    "city", "state", "club", "skillLevel", "photo", "registrationDate",
    "currentPoints", "currentRanking", "matchesPlayed", "wins", "losses",
    "titlesWon",
  ],
  Clubs: [
    "id", "name", "address", "city", "state", "contactPerson",
    "contactNumber", "members",
  ],
  Tournaments: [
    "id", "name", "description", "venue", "startDate", "endDate",
    "organizer", "organizerId", "category", "format", "status", "createdAt",
  ],
  Teams: [
    "id", "name", "player1Id", "player2Id", "tournamentId", "points",
    "ranking",
  ],
  Registrations: [
    "id", "tournamentId", "playerId", "teamId", "type", "status",
    "registeredAt",
  ],
  Matches: [
    "id", "tournamentId", "round", "court", "matchDate", "matchTime",
    "side1Id", "side2Id", "side1Name", "side2Name", "set1", "set2", "set3",
    "winnerId", "loserId", "duration", "status",
  ],
  Rankings: [
    "id", "scope", "scopeValue", "playerId", "playerName", "club", "state",
    "points", "matchesPlayed", "wins", "winPercentage", "titlesWon", "rank",
    "year", "updatedAt",
  ],
  Points_Config: ["key", "label", "value"],
  Notifications: [
    "id", "userId", "type", "title", "message", "read", "createdAt",
  ],
  Audit_Log: [
    "id", "userId", "userName", "action", "entity", "details", "timestamp",
  ],
};

// Columns that hold genuine numbers (not numeric-looking text like phone
// numbers, which must keep their exact string form). Every table column is
// stored as SQL TEXT (see db/client.js), so these are coerced back to real
// JS numbers on read — needed for correct numeric sort/filter in AG Grid and
// for arithmetic in the UI without every call site re-wrapping in Number().
export const NUMERIC_COLUMNS = {
  Players: ["age", "currentPoints", "currentRanking", "matchesPlayed", "wins", "losses", "titlesWon"],
  Clubs: ["members"],
  Teams: ["points", "ranking"],
  Rankings: ["points", "matchesPlayed", "wins", "winPercentage", "titlesWon", "rank", "year"],
  Points_Config: ["value"],
  Notifications: ["read"],
};

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  ORGANIZER: "Tournament Organizer",
  PLAYER: "Player",
};

export const SKILL_LEVELS = ["-","Beginner", "Intermediate", "Advanced", "Professional"];

export const TOURNAMENT_CATEGORIES = [
  "Singles",
  "Men's Doubles",
  "Women's Doubles",
  "Mixed Doubles",
];

export const TOURNAMENT_FORMATS = [
  "Knockout",
  "Round Robin",
  "League",
  "League + Knockout",
];

export const TOURNAMENT_STATUS = [
  "Draft",
  "Registration Open",
  "Ongoing",
  "Completed",
];

export const REGISTRATION_STATUS = ["Pending", "Approved", "Rejected", "Waitlisted"];

export const MATCH_STATUS = ["Scheduled", "Live", "Completed", "Walkover"];

export const DEFAULT_POINTS_CONFIG = [
  { key: "matchWin", label: "Match Win", value: 20 },
];
