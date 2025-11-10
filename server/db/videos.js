// Delegate to the Postgres version
export * from "./videos.pg.js";
// If someone imported a default, keep it harmlessly undefined:
export default undefined;
