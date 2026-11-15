import { db } from "./index.js";
import { users, profiles } from "./schema/index.js";

async function check() {
  const u = await db.select().from(users);
  const p = await db.select().from(profiles);
  console.log("=== Users in DB ===");
  u.forEach((x) => console.log(`- ${x.email} | id: ${x.id} | role: ${x.role}`));
  console.log("=== Profiles in DB ===");
  p.forEach((x) =>
    console.log(
      `- username: ${x.username} | userId: ${x.userId} | region: ${x.region} | dob: ${x.dob} | isRegionVisible: ${x.isRegionVisible}`
    )
  );
  process.exit(0);
}
check();
