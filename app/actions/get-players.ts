'use server'

export async function getAllPlayers() {
    console.log("DIAG: getAllPlayers Start");
    const mock = [
        {
            id: 'mock-player',
            name: 'Diagnostic User',
            index: 0,
            handicapIndex: 0,
            preferred_tee_box: 'White',
            email: 'diag@example.com'
        }
    ];
    console.log("DIAG: getAllPlayers End");
    return mock;
}
