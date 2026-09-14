import { runMigrations } from "../migrate.js";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

runMigrations(url)
  .then((n) => {
    console.log(`migrations applied (${n} folder${n === 1 ? "" : "s"} checked)`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
