# Bitespeed Identity Reconciliation

This is a backend service for Bitespeed's Identity Reconciliation task, built to help "FluxKart.com" track customer identities across multiple purchases.

## Live URLs

- **Frontend Testing UI**: [https://ais-pre-7rxn4k77mzfv2vmyu6av36-600842021659.asia-east1.run.app/](https://ais-pre-7rxn4k77mzfv2vmyu6av36-600842021659.asia-east1.run.app/)
- **API Endpoint**: [https://ais-pre-7rxn4k77mzfv2vmyu6av36-600842021659.asia-east1.run.app/identify](https://ais-pre-7rxn4k77mzfv2vmyu6av36-600842021659.asia-east1.run.app/identify)

*Note: The app is currently hosted on Cloud Run using an in-memory/ephemeral SQLite DB for demonstration purposes. In a true production environment, I would connect this to a managed PostgreSQL instance to ensure data persistence across container scale-downs.*

## Tech Stack Justification

- **Next.js (App Router)**: Provides a robust, unified framework for both the backend API routes (`/api/identify`) and a clean frontend UI to test the endpoint easily.
- **TypeScript**: Ensures type safety, reducing runtime errors and making the data structures (like the `Contact` model) explicit and easy to reason about.
- **better-sqlite3**: A fast, synchronous SQLite driver for Node.js. It's perfect for a lightweight, zero-config relational database setup for this assignment.
- **Tailwind CSS**: Used for rapidly styling the frontend testing interface.

## Architecture & Logic Summary

The core logic resides in `app/api/identify/route.ts`. When a request comes in with an `email` and/or `phoneNumber`:

1. **Search**: The system queries the database for any contacts matching the provided email or phone number.
2. **No Matches**: If no contacts match, a new `primary` contact is created.
3. **Matches Found**:
   - The system traces all matched contacts back to their `primary` contacts (by checking `linkedId`).
   - **Merging**: If multiple distinct primary contacts are found (e.g., an email belongs to one primary, and a phone belongs to another), the algorithm sorts them by `createdAt` ascending. The oldest contact becomes the "winner" (the true primary). All other "loser" primary contacts and their associated secondary contacts are updated to point to the winner as their new `linkedId` and their `linkPrecedence` is set to `secondary`.
4. **New Information**: If the incoming request contains an email or phone number that doesn't exist anywhere in the consolidated contact tree, a new `secondary` contact is created and linked to the winner primary contact.
5. **Formatting**: The response is formatted to ensure the primary contact's email and phone number are always the first elements in their respective arrays, followed by all unique secondary emails and phone numbers.

*(Note: The response key `primaryContatctId` is intentionally spelled with the typo to strictly match the provided spec payload).*

## Instructions to Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Prush69/Bitespeed.git
   cd Bitespeed
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Test the API**:
   - Open [http://localhost:3000](http://localhost:3000) in your browser to use the frontend UI.
   - Or send a POST request to `http://localhost:3000/identify`:
     ```bash
     curl -X POST http://localhost:3000/identify \
     -H "Content-Type: application/json" \
     -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
     ```
