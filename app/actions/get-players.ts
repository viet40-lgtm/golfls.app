'use server'

export async function getAllPlayers() {
    return [
        { id: 'mock-p1', name: 'Diagnostic Player', index: 0, handicapIndex: 0, preferredTeeBox: 'White' }
    ];
}
