// Temporary shim to keep legacy imports working.
// Routes now use Postgres via pool.js.
export { query, withTransaction, default as pool } from "./pool.js";
