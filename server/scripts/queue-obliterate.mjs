#!/usr/bin/env node
import { obliterateVideoQueue } from "../queues/videoQueue.js";

const force = process.argv.includes("--force");

obliterateVideoQueue({ force })
  .then((result) => {
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  });
