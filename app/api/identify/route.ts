import { NextResponse } from "next/server";
import db from "@/lib/db";

interface IdentifyPayload {
  email?: string | null;
  phoneNumber?: string | number | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IdentifyPayload;
    let { email, phoneNumber } = body;

    if (email) email = String(email);
    if (phoneNumber) phoneNumber = String(phoneNumber);

    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: "Either email or phoneNumber must be provided" },
        { status: 400 },
      );
    }

    // 1. Find matching contacts
    const matchesResult = await db.query(
      `SELECT * FROM "Contact" 
       WHERE (email = $1 AND email IS NOT NULL) 
          OR ("phoneNumber" = $2 AND "phoneNumber" IS NOT NULL)`,
      [email || null, phoneNumber || null]
    );
    const matches = matchesResult.rows;

    const now = new Date().toISOString();

    if (matches.length === 0) {
      // Create new primary
      const insertResult = await db.query(
        `INSERT INTO "Contact" (email, "phoneNumber", "linkPrecedence", "createdAt", "updatedAt")
         VALUES ($1, $2, 'primary', $3, $4) RETURNING id`,
        [email || null, phoneNumber || null, now, now]
      );
      const newId = insertResult.rows[0].id;

      return NextResponse.json({
        contact: {
          // Note: Spelling kept as 'primaryContatctId' to match the spec payload.
          primaryContatctId: newId,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // 2. Find all primary IDs involved
    const primaryIds = new Set<number>();
    for (const match of matches) {
      if (match.linkPrecedence === "primary") {
        primaryIds.add(match.id);
      } else {
        primaryIds.add(match.linkedId);
      }
    }

    // Fetch all primary contacts
    const placeholders = Array.from(primaryIds).map((_, i) => `$${i + 1}`).join(',');
    const primaryContactsResult = await db.query(
      `SELECT * FROM "Contact" WHERE id IN (${placeholders})`,
      Array.from(primaryIds)
    );
    const primaryContacts = primaryContactsResult.rows;

    // Sort by createdAt ASC to find the oldest primary
    primaryContacts.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const winner = primaryContacts[0];
    const losers = primaryContacts.slice(1);

    // 3. Update losers and their secondaries to point to winner
    if (losers.length > 0) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        for (const loser of losers) {
          await client.query(
            `UPDATE "Contact" 
             SET "linkedId" = $1, "linkPrecedence" = 'secondary', "updatedAt" = $2 
             WHERE id = $3 OR "linkedId" = $4`,
            [winner.id, now, loser.id, loser.id]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    // 4. Fetch ALL contacts in the tree
    const allTreeContactsResult = await db.query(
      `SELECT * FROM "Contact" WHERE id = $1 OR "linkedId" = $2 ORDER BY "createdAt" ASC`,
      [winner.id, winner.id]
    );
    const allTreeContacts = allTreeContactsResult.rows;

    // 5. Check if we need to insert a new secondary
    const emailIsNew = email && !allTreeContacts.some((c) => c.email === email);
    const phoneIsNew = phoneNumber && !allTreeContacts.some((c) => c.phoneNumber === phoneNumber);

    if (emailIsNew || phoneIsNew) {
      const insertSecondaryResult = await db.query(
        `INSERT INTO "Contact" (email, "phoneNumber", "linkedId", "linkPrecedence", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'secondary', $4, $5) RETURNING id`,
        [email || null, phoneNumber || null, winner.id, now, now]
      );
      const newId = insertSecondaryResult.rows[0].id;

      // Add to tree contacts for response formatting
      allTreeContacts.push({
        id: newId,
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: winner.id,
        linkPrecedence: "secondary",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }

    // 6. Format response
    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();
    const secondaryContactIds: number[] = [];

    if (winner.email) emails.add(winner.email);
    if (winner.phoneNumber) phoneNumbers.add(winner.phoneNumber);

    for (const c of allTreeContacts) {
      if (c.email) emails.add(c.email);
      if (c.phoneNumber) phoneNumbers.add(c.phoneNumber);
      if (c.id !== winner.id) {
        secondaryContactIds.push(c.id);
      }
    }

    return NextResponse.json({
      contact: {
        // Note: Spelling kept as 'primaryContatctId' to match the spec payload.
        primaryContatctId: winner.id,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds,
      },
    });
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
