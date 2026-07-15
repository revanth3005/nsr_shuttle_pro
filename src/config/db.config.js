// Turso (libSQL) connection settings — read directly by the app, no
// environment variables involved.
//
// How to get these values (free):
//   1. Sign up at https://turso.tech
//   2. Create a database:       turso db create shuttlepro
//   3. Get the connection URL:  turso db show shuttlepro --url
//   4. Create an auth token:    turso db tokens create shuttlepro
//
// Paste the two values below, then restart the dev server.
export const DB_CONFIG = {
  url: "libsql://shuttlepro-revanth3005.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQxMjQwMDcsImlkIjoiMDE5ZjY1ZDktODEwMS03ZmUzLWFkZjktNGVjYTcyMDM5YTg4Iiwia2lkIjoiX05QYk5BZ2FtaHhkR2QwWEdjZHFjZXlucXZrLXA4VVpCR0xDanhUakxKNCIsInJpZCI6IjM2OTZmNjE1LWU4NWItNDI5Zi04M2JjLWMyNjViOWFjZmEwYiJ9.B8WwoiOrxOD_QyeaQ3vMcoYFinghkwkOJ18gA24JWUz26gRZc2WWbxfCCzB6TWUrqhbzosd25bPHDRZGRYDwCQ",
};
