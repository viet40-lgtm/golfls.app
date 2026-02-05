import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TestDbPage() {
    let status = 'INIT';
    let error = null;
    let data = null;
    let envCheck = {
        has_db_url: !!process.env.DATABASE_URL,
        node_env: process.env.NODE_ENV,
        url_prefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 10) + '...' : 'MISSING'
    };

    try {
        status = 'CONNECTING';
        // Try a simple count query
        const count = await prisma.course.count();
        status = 'SUCCESS';
        data = { count };
    } catch (e: any) {
        status = 'FAILED';
        error = e.message + (e.stack ? '\n' + e.stack : '');
    }

    return (
        <div className="p-8 font-mono text-sm max-w-4xl mx-auto">
            <h1 className="text-xl font-bold mb-4">Database Connection Test</h1>

            <div className="mb-6 p-4 bg-gray-100 rounded">
                <h2 className="font-bold mb-2">Environment</h2>
                <pre>{JSON.stringify(envCheck, null, 2)}</pre>
            </div>

            <div className={`mb-6 p-4 rounded text-white ${status === 'SUCCESS' ? 'bg-green-600' : 'bg-red-600'}`}>
                <h2 className="font-bold mb-2">Status: {status}</h2>
                {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
                {error && <pre className="whitespace-pre-wrap">{error}</pre>}
            </div>

            <div className="text-gray-500">
                Timestamp: {new Date().toISOString()}
            </div>
        </div>
    );
}
