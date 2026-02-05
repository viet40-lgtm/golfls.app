
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("API: /api/courses called");
        // Return Mocked Course
        const mock = [
            {
                id: 'mock-course',
                name: 'Diagnostic Course',
                teeBoxes: [{ id: 'mock-tee', name: 'White', rating: 68.0, slope: 110, par: 70 }],
                holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, difficulty: i + 1 }))
            }
        ];
        return NextResponse.json(mock);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
