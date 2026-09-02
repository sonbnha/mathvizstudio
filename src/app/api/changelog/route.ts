import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CHANGELOG } from '@/config/changelog';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Ensure all static CHANGELOG releases exist in database
    for (const item of [...CHANGELOG].reverse()) {
      try {
        const existing = await prisma.changelog.findUnique({
          where: { version: item.version },
        });
        if (!existing) {
          await prisma.changelog.create({
            data: {
              version: item.version,
              date: item.date,
              title: item.title,
              changes: item.changes,
              isPublished: true,
            },
          });
        }
      } catch {
        // ignore duplicate
      }
    }

    const changelogs = await prisma.changelog.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });

    const dbList = changelogs.map((c) => ({
      id: c.id,
      version: c.version,
      date: c.date,
      title: c.title,
      changes: c.changes,
      isPublished: c.isPublished,
    }));

    // 2. Merge: Guarantee that static CHANGELOG releases are ordered first (newest at top)
    const mergedList: any[] = [];
    const seen = new Set<string>();

    for (const item of CHANGELOG) {
      const dbMatch = dbList.find((d) => d.version === item.version);
      if (dbMatch) {
        mergedList.push(dbMatch);
      } else {
        mergedList.push(item);
      }
      seen.add(item.version);
    }

    for (const dbItem of dbList) {
      if (!seen.has(dbItem.version)) {
        mergedList.push(dbItem);
        seen.add(dbItem.version);
      }
    }

    return NextResponse.json({
      changelogs: mergedList,
    });
  } catch (error: any) {
    console.error('Error fetching public changelogs:', error);
    // Fallback to static config if DB connection fails
    return NextResponse.json({
      changelogs: CHANGELOG,
    });
  }
}
