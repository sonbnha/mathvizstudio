import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CHANGELOG, sortChangelogsList } from '@/config/changelog';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Ensure all static initial releases exist in database
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

    // 2. Query Single Source of Truth from Database
    const changelogs = await prisma.changelog.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = changelogs.map((c) => ({
      id: c.id,
      version: c.version,
      date: c.date,
      title: c.title,
      changes: c.changes,
      isPublished: c.isPublished,
      createdAt: c.createdAt,
    }));

    // 3. Sort strictly by semantic version & date
    const sorted = sortChangelogsList(mapped);

    const response = NextResponse.json({
      changelogs: sorted,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return response;
  } catch (error: any) {
    console.error('Error fetching public changelogs:', error);
    return NextResponse.json({
      changelogs: sortChangelogsList(CHANGELOG),
    });
  }
}
