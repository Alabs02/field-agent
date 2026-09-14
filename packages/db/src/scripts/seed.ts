import { createDb } from "../client.js";
import { seedPortals } from "../seed/portals.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const { db, close } = createDb(url, { max: 1 });
seedPortals(db)
  .then(async () => {
    console.log("seeded portal briargate");
    await close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await close();
    process.exit(1);
  });
