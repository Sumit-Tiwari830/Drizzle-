import { db } from "./index.js";
import { users, profiles } from "./schema/index.js";
import { hashPassword } from "../utils/hash.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting PostgreSQL User Seeding...");

  const defaultPassword = "password123";
  const passwordHash = await hashPassword(defaultPassword);

  const testUsersData = [
    {
      email: "alice@example.com",
      role: "USER",
      isVerified: true,
      isEmailVerified: true,
      isLocked: false,
      profile: {
        username: "Alice_Explorer",
        actualName: "Alice Sharma",
        gender: "FEMALE",
        dob: "2000-04-12",
        height: "168 cm",
        region: "Mumbai, Maharashtra",
        isRegionVisible: true,
        bio: "Art director & weekend hiker. Love exploring indie bookstores, filter coffee, and acoustic concerts.",
        interests: ["Art", "Coffee", "Hiking", "Books", "Music"],
        lookingFor: "Long-term relationship",
        interestedIn: "everyone",
        city: "Mumbai",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
        realPhotos: [
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
        ],
        isPublicReveal: false,
      },
    },
    {
      email: "bob@example.com",
      role: "USER",
      isVerified: true,
      isEmailVerified: true,
      isLocked: false,
      profile: {
        username: "Bob_Architect",
        actualName: "Bob Roy",
        gender: "MALE",
        dob: "1998-08-25",
        height: "180 cm",
        region: "Bangalore, Karnataka",
        isRegionVisible: true,
        bio: "Architect & urban photographer. Passionate about minimalist design, sourdough baking, and cycling.",
        interests: ["Architecture", "Photography", "Cycling", "Coffee", "Tech"],
        lookingFor: "Long-term relationship",
        interestedIn: "everyone",
        city: "Bangalore",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
        realPhotos: [
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
        ],
        isPublicReveal: false,
      },
    },
  ];

  for (const item of testUsersData) {
    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, item.email))
      .limit(1);

    if (existing) {
      console.log(`ℹ️ User ${item.email} already exists (ID: ${existing.id}). Skipping.`);
      continue;
    }

    // Insert user
    const [newUser] = await db
      .insert(users)
      .values({
        email: item.email,
        passwordHash,
        role: item.role,
        isVerified: item.isVerified,
        isEmailVerified: item.isEmailVerified,
        isLocked: item.isLocked,
      })
      .returning();

    console.log(`✅ Created User: ${newUser.email} (ID: ${newUser.id})`);

    // Insert profile
    await db.insert(profiles).values({
      userId: newUser.id,
      ...item.profile,
    });

    console.log(`   └─ Created Profile: ${item.profile.username} (${item.profile.region})`);
  }

  console.log("\n🎉 Seeding Complete! You can now log in with:");
  console.log("   👉 Email: alice@example.com | Password: password123");
  console.log("   👉 Email: bob@example.com   | Password: password123\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
