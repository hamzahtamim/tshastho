import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { errorResponse, ErrorCodes } from '@/lib/errors';

/**
 * Returns backup info and health check.
 * Actual backup happens via scheduled cron job (scripts/backup-db.sh).
 */
export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    // DB health check
    const [userCount, orderCount, medicineCount] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.medicine.count(),
    ]);

    // Latest backup info
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(process.cwd(), 'backups');
    let latestBackup = null;
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter((f: string) => f.startsWith('tshastho_'))
        .map((f: string) => ({
          name: f,
          size: fs.statSync(path.join(backupDir, f)).size,
          time: fs.statSync(path.join(backupDir, f)).mtime,
        }))
        .sort((a: any, b: any) => b.time - a.time);

      if (files.length > 0) {
        latestBackup = {
          name: files[0].name,
          sizeMB: (files[0].size / (1024 * 1024)).toFixed(2),
          time: files[0].time,
        };
      }
    }

    return NextResponse.json({
      success: true,
      health: {
        users: userCount,
        orders: orderCount,
        medicines: medicineCount,
      },
      backup: {
        latest: latestBackup,
        schedule: 'Daily at 2:00 AM (configured via cron)',
        scriptPath: 'scripts/backup-db.sh',
      },
    });
  } catch (error) {
    console.error('[BACKUP_STATUS]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Health check failed', 500);
  }
}
