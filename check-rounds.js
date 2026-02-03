const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rounds = await prisma.liveRound.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, shortId: true, createdAt: true }
    });
    console.log(JSON.stringify(rounds, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
