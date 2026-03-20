# 🔗 Bitespeed Identity Reconciliation

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat&logo=vercel)](https://bitespeed-kohl.vercel.app/)

A robust backend service for Bitespeed's Identity Reconciliation task. This service helps "FluxKart.com" track and consolidate customer identities across multiple purchases, linking emails and phone numbers to a single primary identity.

---

## 🚀 Live Demo

- **Frontend Testing UI**: [https://bitespeed-kohl.vercel.app/](https://bitespeed-kohl.vercel.app/)
- **API Endpoint**: [https://bitespeed-kohl.vercel.app/identify](https://bitespeed-kohl.vercel.app/identify)

---

## ✨ Key Features

- **ACID Compliant Merges**: Uses SQL Transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) to ensure data integrity when merging multiple primary contacts.
- **SQL Injection Prevention**: Utilizes parameterized queries (`$1`, `$2`) for all database interactions.
- **Serverless Optimized**: Database connections are pooled and schema initialization is decoupled from the runtime to minimize cold start latency.
- **Type Safe**: End-to-end type safety using TypeScript interfaces for request payloads and database models.
- **Interactive UI**: Includes a clean, Tailwind-styled frontend to easily test the API without needing Postman.

---

## 🛠️ Tech Stack & Justification

- **Next.js (App Router)**: Provides a unified framework for both the backend API routes (`/api/identify`) and the frontend testing UI. A rewrite rule maps `/identify` to `/api/identify` to strictly adhere to the spec.
- **TypeScript**: Ensures type safety, reducing runtime errors and making data structures explicit.
- **PostgreSQL (`pg`)**: A production-ready relational database, perfect for handling the complex relational logic required for identity linking.
- **Tailwind CSS**: Used for rapidly styling the frontend testing interface.

---

## 🧠 Architecture & Core Logic

The core reconciliation algorithm resides in `app/api/identify/route.ts`. When a request is received:

1. **Search**: Queries the database for any contacts matching the provided `email` or `phoneNumber`.
2. **Creation**: If no matches exist, a new `primary` contact is created.
3. **Tracing & Merging**:
   - Traces all matched contacts back to their root `primary` contacts.
   - If multiple distinct primary contacts are found, they are sorted by `createdAt`.
   - The oldest contact becomes the "winner" (true primary).
   - All newer primary contacts ("losers") and their associated secondary contacts are updated to point to the winner, changing their `linkPrecedence` to `secondary`.
4. **Appending**: If the request contains new information (an email or phone not present in the consolidated tree), a new `secondary` contact is created and linked to the winner.
5. **Formatting**: Constructs the response, ensuring the primary contact's email and phone number are always the first elements in their respective arrays.

> **Note:** The response key `primaryContatctId` is intentionally spelled with the typo (instead of `primaryContactId`) to strictly match the provided spec payload.

---

## 📖 API Documentation

### `POST /identify`

**Request Body:**
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Success Response (200 OK):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Prush69/Bitespeed.git
cd Bitespeed
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory and add your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://user:password@hostname/dbname?sslmode=require"
```

### 4. Initialize the Database
Run the following SQL command in your PostgreSQL database to create the required table:
```sql
CREATE TABLE IF NOT EXISTS "Contact" (
  id SERIAL PRIMARY KEY,
  "phoneNumber" VARCHAR(255),
  email VARCHAR(255),
  "linkedId" INTEGER,
  "linkPrecedence" VARCHAR(50) CHECK("linkPrecedence" IN ('primary', 'secondary')) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL,
  "deletedAt" TIMESTAMP
);
```

### 5. Start the Server
```bash
npm run dev
```

### 6. Test the Application
- Open [http://localhost:3000](http://localhost:3000) in your browser to use the interactive UI.
- Or test via cURL:
  ```bash
  curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
  ```
