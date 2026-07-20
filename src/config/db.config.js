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
  url: "",
  authToken: "",
};
