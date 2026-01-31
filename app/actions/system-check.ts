'use server'

import { prisma } from '@/lib/prisma';

export async function systemCheck() {
    const dbUrl = process.env.DATABASE_URL || '';
    const hasPgbouncer = dbUrl.includes('pgbouncer=true');
    const port = dbUrl.match(/:(\d+)\//)?.[1];

    let dbStatus = 'pending';
    let dbError = null;
    let playerCount = -1;

    try {
        console.log("SYSTEM CHECK: Connecting to DB...");
        await prisma.$connect();
        dbStatus = 'connected';
        console.log("SYSTEM CHECK: Counting players...");
        playerCount = await prisma.player.count();
        console.log("SYSTEM CHECK: Success! Count:", playerCount);
    } catch (e) {
        console.error("SYSTEM CHECK: Failed", e);
        dbStatus = 'failed';
        dbError = e instanceof Error ? e.message : String(e);
    }

    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasDbUrl: !!dbUrl,
            dbUrlAnalysis: {
                length: dbUrl.length,
                port: port,
                hasPgbouncer: hasPgbouncer,
                protocol: dbUrl.split(':')[0],
                host: dbUrl.split('@')[1]?.split(':')[0] || 'unknown'
            }
        },
        database: {
            status: dbStatus,
            error: dbError,
            records: playerCount
        }
    };
}
