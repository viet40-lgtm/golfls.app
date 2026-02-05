
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Testing Prisma connection...');
    try {
        const count = await prisma.course.count();
        console.log('Course count:', count);
        const courses = await prisma.course.findMany({ take: 1 });
        console.log('Sample course:', JSON.stringify(courses, null, 2));
    } catch (e) {
        console.error('Prisma test failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
