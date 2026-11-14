# 💘 Anonymous-First Dating App Backend (TypeScript)

A production-ready dating application backend built with **TypeScript**, **Express**, **Drizzle ORM**, and **PostgreSQL**.

---

## 🌟 Core Business Rules & Features Implemented

### 1. Dual User Roles (Admin vs. User)
- **`ADMIN`**: 
  - Uploads Master Directory Excel sheets (`.xlsx`, `.xls`, `.csv`).
  - Views unverified users and manually approves/promotes them to the Master Database.
- **`USER`**:
  - Regular app members who connect, chat, and match.

### 2. Master Directory ("Actual / Truth Database")
- Stored in the `master_directory` table containing verified records: `email`, `actual_name`, `official_gender`, `department_or_batch`.
- Populated via:
  1. **Excel Sheet Upload by Admin** (Bulk insert/update).
  2. **Admin Manual Verification** of unverified registered users.
- **Account Deletion Safety**: When a user deletes their app account, it **ONLY soft-deletes** their record in `users` (`is_deleted = true`). **The Master Database is NEVER touched or deleted!**

### 3. Two Types of Registered Users
- **Verified User**: If the user's email is found in `master_directory`, their account is automatically marked `is_verified = true`, and their official name & gender are locked to the verified record.
- **Unverified User**: If the email is not in `master_directory`, they register with `is_verified = false`, and their self-declared gender is marked unverified until Admin review.

### 4. Anonymous-First / Profile Reveal Protocol
- **Pseudonym First**: Every user has a `username` (pseudonym/handle, e.g., `MysticWanderer`) distinct from their `actual_name`.
- **Default Hidden**: By default, `actual_name` and `real_photos` are **NEVER revealed** in discovery. Users only see `username`, anonymous avatar, age, gender, bio, interests, and city.
- **Two Ways to Reveal**:
  1. **Mutual Reveal for Matched Candidates**: When two candidates match, either can send a reveal request. **Only when BOTH candidates accept**, their actual names and real photos are unlocked for each other.
  2. **Public Reveal by User Choice**: A user can toggle `is_public_reveal = true` at any time to make their credentials public to all.

### 5. Connect Request Quota (Max 10 in 24 Hours)
- Any user (boy or girl) can send connect requests to other available users.
- **Rate Limit**: Maximum **10 requests per rolling 24-hour window**.

### 6. Exclusive Matching & Lockdown
- When a request is accepted:
  - Both candidates enter an **exclusive match** (`status = 'ACTIVE'`).
  - **Both candidates become LOCKED (`is_locked = true`)**:
    - Cannot send any new requests.
    - Cannot receive any requests (hidden from discovery feed).
    - Any other pending requests involving either candidate are automatically cancelled.

### 7. Unmatching & Username Change
- If either candidate calls `unmatch`:
  - **BOTH candidates are unmatched** (`status = 'UNMATCHED'`).
  - **BOTH candidates are UNLOCKED (`is_locked = false`)** and return to the discovery feed.
  - **Username Change Enabled**: Both candidates are given the option to update their `username` so they aren't easily recognized again.

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user (auto-checks Master DB) | Public |
| `POST` | `/api/v1/auth/login` | Login with email & password (returns JWT) | Public |
| `DELETE` | `/api/v1/auth/delete-account` | Soft-deletes user (releases match, preserves Master DB) | User |

### 🛡️ Admin Management (`/api/v1/admin`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/upload-master-sheet` | Upload Excel sheet to update Master Directory | Admin |
| `GET` | `/api/v1/admin/unverified-users` | List all unverified registered users | Admin |
| `POST` | `/api/v1/admin/verify-user/:id` | Manually verify an unverified user | Admin |

### 👤 Profile Management (`/api/v1/profiles`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/profiles/me` | Get own profile | User |
| `PUT` | `/api/v1/profiles/username` | Change `username` (pseudonym, e.g. after unmatch) | User |
| `PUT` | `/api/v1/profiles/toggle-public-reveal` | Toggle `isPublicReveal` on/off | User |
| `PUT` | `/api/v1/profiles/me` | Update bio, interests, city, photos | User |

### 💌 Connect Requests (`/api/v1/requests`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/requests/send` | Send request (max 10/24h, blocked if locked) | User |
| `POST` | `/api/v1/requests/:id/respond` | Respond (`action: 'ACCEPT' \| 'REJECT'`) | User |
| `GET` | `/api/v1/requests/my-requests` | View incoming & outgoing pending requests | User |

### 💘 Matches (`/api/v1/matches`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/matches/my-match` | Get current active match & partner (respects reveal) | User |
| `POST` | `/api/v1/matches/:id/reveal-request` | Request/Accept mutual profile reveal | User |
| `POST` | `/api/v1/matches/:id/unmatch` | Unmatch pair (unlocks both candidates) | User |

### 🔍 Discovery (`/api/v1/discovery`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/discovery/feed` | Discovery cards (excludes locked/matched users) | User |

---

## 🚀 Running the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dating_app
JWT_ACCESS_SECRET=your_super_secret_jwt_key_32_characters_long
```

### 3. Sync Database with Drizzle ORM
```bash
# Push tables directly to PostgreSQL
npm run db:push

# Open Drizzle Visual Studio in browser
npm run db:studio
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
npm start
```
