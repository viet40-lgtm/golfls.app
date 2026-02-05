
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    if (process.env.NODE_ENV === 'development') {
        console.log("PRISMA: Initializing Client (Dev)...");
    }

    try {
        const url = process.env.DATABASE_URL;
        if (!url) {
            console.error("CRITICAL: DATABASE_URL is not defined");
            // Return a minimal client that won't crash immediately but will fail on query
            // We provide a dummy URL to satisfy the constructor if needed, or let it fail later
        }

        return new PrismaClient({
            log: ['error', 'warn'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        });
    } catch (e) {
        console.error("CRITICAL: Failed to initialize PrismaClient:", e);
        throw e;
    }
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// In Next.js, we want a singleton to avoid exhausting db connections
let prisma: ReturnType<typeof prismaClientSingleton>;

try {
    prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
} catch (e) {
    console.error("CRITICAL: Prisma Global Init Failed:", e);
    // Fallback? If we can't init prisma, the app is largely broken.
    // But we want to avoid 500 on valid static pages.
    // We can't really "fake" a PrismaClient easily without a proxy.
    // Re-throwing is probably the most honest thing, but logging it explicitly helps diagnostics.
    throw e;
}

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma
}

export { prisma }
