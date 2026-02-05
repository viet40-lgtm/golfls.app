'use server'

export async function getAllCourses() {
    return [
        {
            id: 'mock-1',
            name: 'Diagnostic: Hardcoded Course',
            teeBoxes: [{ id: 'mock-t1', name: 'Standard', rating: 70, slope: 113, par: 72 }],
            holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, difficulty: i + 1 }))
        }
    ];
}
