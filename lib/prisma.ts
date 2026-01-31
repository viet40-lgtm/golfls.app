
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    console.log("PRISMA INIT: Initializing Client...");
    console.log("PRISMA INIT: Env Check -> NODE_ENV:", process.env.NODE_ENV);
    console.log("PRISMA INIT: Env Check -> DATABASE_URL:", process.env.DATABASE_URL ? "DEFINED (Length: " + process.env.DATABASE_URL.length + ")" : "UNDEFINED");

    try {
        return new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
        })
    } catch (e) {
        console.error("PRISMA INIT: CRITICAL FAILURE during new PrismaClient()", e);
        // Return a broken client that throws on access, instead of crashing the process
        return new Proxy({}, {
            get: function (_target, prop) {
                throw new Error(`Prisma Client Failed to Initialize: ${e instanceof Error ? e.message : String(e)}`);
            }
        }) as unknown as PrismaClient;
    }
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
