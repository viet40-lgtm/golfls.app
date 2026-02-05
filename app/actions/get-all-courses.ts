'use server'

export async function getAllCourses() {
    console.log("DIAG: getAllCourses Start");
    const mock = [
        {
            id: 'mock-course',
            name: 'Diagnostic Course',
            teeBoxes: [{ id: 'mock-tee', name: 'White', rating: 68.0, slope: 110, par: 70 }],
            holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, difficulty: i + 1 }))
        }
    ];
    console.log("DIAG: getAllCourses End");
    return mock;
}
