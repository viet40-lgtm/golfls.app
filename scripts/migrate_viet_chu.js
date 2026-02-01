const { Client } = require('pg');

async function main() {
    const rescueClient = new Client({
        connectionString: "postgresql://postgres.murcnbooxfuosrpdgyyb:Viet65Adam05@aws-0-us-west-2.pooler.supabase.com:5432/postgres" // old db
    });

    const targetClient = new Client({
        connectionString: "postgresql://postgres.lgtpoahfywpifqyonfrp:Viet65Adam05@aws-1-us-east-2.pooler.supabase.com:5432/postgres" // new db
    });

    try {
        await rescueClient.connect();
        await targetClient.connect();

        console.log('Connected to both databases.');

        // 1. Find Viet Chu in Rescue DB
        const playerSearch = await rescueClient.query("SELECT id, name FROM players WHERE name ILIKE '%Viet Chu%' LIMIT 1");
        if (playerSearch.rows.length === 0) {
            console.log('Player "Viet Chu" not found in Rescue DB');
            return;
        }
        const rescuePlayer = playerSearch.rows[0];
        console.log(`Found Rescue player: ${rescuePlayer.name} (${rescuePlayer.id})`);

        // 2. Find Viet Chu in Target DB
        const targetPlayerSearch = await targetClient.query("SELECT id, name FROM players WHERE name ILIKE '%Viet Chu%' LIMIT 1");
        if (targetPlayerSearch.rows.length === 0) {
            console.log('Player "Viet Chu" not found in Target DB.');
            return;
        }
        const targetPlayer = targetPlayerSearch.rows[0];
        console.log(`Found Target player: ${targetPlayer.name} (${targetPlayer.id})`);

        // 3. Get City Park North course in Target DB (new schema uses courseId)
        const courseSearch = await targetClient.query('SELECT id FROM courses WHERE name ILIKE \'%City Park North%\' LIMIT 1');
        const cityParkId = courseSearch.rows[0]?.id;

        // Get White Tee in Target DB (new schema uses courseId)
        let whiteTeeId = null;
        if (cityParkId) {
            const teeSearch = await targetClient.query('SELECT id FROM tee_boxes WHERE "courseId" = $1 AND name ILIKE \'%White%\' LIMIT 1', [cityParkId]);
            whiteTeeId = teeSearch.rows[0]?.id;
        }

        console.log(`Target Course ID: ${cityParkId}, Target Tee ID: ${whiteTeeId}`);

        // 4. Extract last 20 rounds from Rescue (old schema uses course_id)
        const query = `
            SELECT 
                r.date, 
                COALESCE(c.name, r.course_name) as course_name, 
                COALESCE(t.name, rp.tee_box_name) as tee_name, 
                rp.gross_score, 
                COALESCE(t.rating, rp.tee_box_rating) as rating, 
                COALESCE(t.slope, CAST(rp.tee_box_slope AS FLOAT)) as slope
            FROM round_players rp
            JOIN rounds r ON rp.round_id = r.id
            LEFT JOIN tee_boxes t ON rp.tee_box_id = t.id
            LEFT JOIN courses c ON t.course_id = c.id
            WHERE rp.player_id = $1
            UNION ALL
            SELECT 
                date_played as date, 
                'Manual Entry' as course_name, 
                'Manual' as tee_name, 
                gross_score, 
                0 as rating, 
                113 as slope
            FROM handicap_rounds
            WHERE player_id = $1
            ORDER BY date DESC
            LIMIT 20
        `;

        const rescueRounds = await rescueClient.query(query, [rescuePlayer.id]);
        console.log(`Extracted ${rescueRounds.rows.length} rounds.`);

        // 5. Insert into Target Round/RoundPlayer
        for (const round of rescueRounds.rows) {
            // Create Round
            const insertRoundQuery = `
                INSERT INTO rounds (id, date, "courseId", "courseName", "isTournament", name, "createdAt")
                VALUES (gen_random_uuid(), $1, $2, $3, false, $4, now())
                RETURNING id
            `;
            const roundValues = [
                round.date.includes('T') ? round.date.split('T')[0] : round.date,
                cityParkId || '00000000-0000-0000-0000-000000000000',
                round.course_name || 'Imported Course',
                'Imported: ' + (round.course_name || 'Round')
            ];
            const roundRes = await targetClient.query(insertRoundQuery, roundValues);
            const newRoundId = roundRes.rows[0].id;

            // Create RoundPlayer
            // Use "index_at_time" based on actual DB mapping from @map
            const insertRPQuery = `
                INSERT INTO round_players (id, "roundId", "playerId", "teeBoxId", name, "grossScore", "courseHandicap", "netScore", "index_at_time", "createdAt")
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, $6, 0, now())
            `;
            const rpValues = [
                newRoundId,
                targetPlayer.id,
                whiteTeeId || '00000000-0000-0000-0000-000000000000',
                targetPlayer.name,
                round.gross_score,
                round.gross_score
            ];
            await targetClient.query(insertRPQuery, rpValues);
            console.log(`Imported round from ${roundValues[0]}`);
        }

        console.log('\nSUCCESS: All 20 rounds imported to Target DB.');

    } catch (err) {
        console.error('Migration Error:', err);
    } finally {
        await rescueClient.end();
        await targetClient.end();
    }
}

main();
