import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CHANGELOG } from '@/config/changelog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let changelogs = await prisma.changelog.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });

    // If database is empty, seed from default static config
    if (!changelogs || changelogs.length === 0) {
      for (const item of [...CHANGELOG].reverse()) {
        try {
          await prisma.changelog.create({
            data: {
              version: item.version,
              date: item.date,
              title: item.title,
              changes: item.changes,
              isPublished: true,
            },
          });
        } catch {
          // ignore duplicate key errors if race condition
        }
      }

      changelogs = await prisma.changelog.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({
      changelogs: changelogs.map((c) => ({
        id: c.id,
        version: c.version,
        date: c.date,
        title: c.title,
        changes: c.changes,
        isPublished: c.isPublished,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching public changelogs:', error);
    // Fallback to static config if DB connection fails
    return NextResponse.json({
      changelogs: CHANGELOG,
    });
  }
}
