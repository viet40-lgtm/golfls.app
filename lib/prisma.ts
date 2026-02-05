
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    if (process.env.NODE_ENV === 'development') {
        console.log("PRISMA: Initializing Client (Dev)...");
    }

    return new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    })
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// In Next.js, we want a singleton to avoid exhausting db connections
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma
}

export { prisma }
