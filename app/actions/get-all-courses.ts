'use server'

export async function getAllCourses() {
    try {
        console.log("HEALTH CHECK: getAllCourses called");
        return [
            {
                id: 'health-check',
                name: 'Server Action Health Check',
                teeBoxes: [{ id: 't1', name: 'White', rating: 71, slope: 120, par: 72 }],
                holes: [{ holeNumber: 1, par: 4, difficulty: 1 }]
            }
        ];
    } catch (e) {
        return { error: String(e) };
    }
}
