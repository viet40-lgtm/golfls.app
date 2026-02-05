'use server'

export async function getCoursesSafe() {
    console.log("DIAG: getCoursesSafe Start");
    const mock = [
        {
            id: 'mock-course',
            name: 'Diagnostic Course',
            teeBoxes: [{ id: 'mock-tee', name: 'White', rating: 68.0, slope: 110, par: 70 }],
            holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, difficulty: i + 1 }))
        }
    ];
    console.log("DIAG: getCoursesSafe End");
    return mock;
}
