import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { email, phoneNumber } = body;

    // The prompt says "phoneNumber"?: number, but examples use strings.
    // We should handle both and convert to string.
    if (email) email = String(email);
    if (phoneNumber) phoneNumber = String(phoneNumber);

    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: "Either email or phoneNumber must be provided" },
        { status: 400 },
      );
    }

    // 1. Find matching contacts
    const matches = db
      .prepare(
        `
      SELECT * FROM Contact 
      WHERE (email = ? AND email IS NOT NULL) 
         OR (phoneNumber = ? AND phoneNumber IS NOT NULL)
    `,
      )
      .all(email || null, phoneNumber || null) as any[];

    const now = new Date().toISOString();

    if (matches.length === 0) {
      // Create new primary
      const insert = db.prepare(`
        INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt)
        VALUES (?, ?, 'primary', ?, ?)
      `);
      const info = insert.run(email || null, phoneNumber || null, now, now);

      return NextResponse.json({
        contact: {
          // Note: Spelling kept as 'primaryContatctId' to match the spec payload.
          primaryContatctId: info.lastInsertRowid,
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
    const placeholders = Array.from(primaryIds)
      .map(() => "?")
      .join(",");
    const primaryContacts = db
      .prepare(
        `
      SELECT * FROM Contact WHERE id IN (${placeholders})
    `,
      )
      .all(...Array.from(primaryIds)) as any[];

    // Sort by createdAt ASC to find the oldest primary
    primaryContacts.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const winner = primaryContacts[0];
    const losers = primaryContacts.slice(1);

    // 3. Update losers and their secondaries to point to winner
    if (losers.length > 0) {
      const update = db.prepare(`
        UPDATE Contact 
        SET linkedId = ?, linkPrecedence = 'secondary', updatedAt = ?
        WHERE id = ? OR linkedId = ?
      `);

      const updateMany = db.transaction((winnerId, updateTime, losersList) => {
        for (const loser of losersList) {
          update.run(winnerId, updateTime, loser.id, loser.id);
        }
      });

      updateMany(winner.id, now, losers);
    }

    // 4. Fetch ALL contacts in the tree
    const allTreeContacts = db
      .prepare(
        `
      SELECT * FROM Contact WHERE id = ? OR linkedId = ? ORDER BY createdAt ASC
    `,
      )
      .all(winner.id, winner.id) as any[];

    // 5. Check if we need to insert a new secondary
    const emailIsNew = email && !allTreeContacts.some((c) => c.email === email);
    const phoneIsNew =
      phoneNumber &&
      !allTreeContacts.some((c) => c.phoneNumber === phoneNumber);

    if (emailIsNew || phoneIsNew) {
      const insertSecondary = db.prepare(`
        INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
        VALUES (?, ?, ?, 'secondary', ?, ?)
      `);
      const info = insertSecondary.run(
        email || null,
        phoneNumber || null,
        winner.id,
        now,
        now,
      );

      // Add to tree contacts for response formatting
      allTreeContacts.push({
        id: info.lastInsertRowid,
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
    // We need to ensure the primary contact's email and phone are the first elements
    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();
    const secondaryContactIds: number[] = [];

    // Add primary contact info first
    if (winner.email) emails.add(winner.email);
    if (winner.phoneNumber) phoneNumbers.add(winner.phoneNumber);

    // Add the rest
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
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
