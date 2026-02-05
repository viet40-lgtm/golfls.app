
import Live2Client from './Live2Client';

export const dynamic = 'force-dynamic';

export default function Live2Page() {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-black mb-8">GolfLS v2</h1>
            <Live2Client />
        </div>
    );
}
