
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
    // Return a dummy object that logs errors when accessed, preventing module crash
    prisma = new Proxy({}, {
        get(_target, prop) {
            return () => {
                console.error(`PRISMA CALL FAILED: Cannot call ${String(prop)} because Prisma failed to initialize.`);
                return Promise.reject(new Error(`Prisma Client is not initialized. check server logs.`));
            };
        }
    }) as any;
}

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma
}

export { prisma }
