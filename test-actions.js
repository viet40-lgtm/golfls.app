
const { getAllCourses } = require('./app/actions/get-all-courses');
const { getPoolResults } = require('./app/actions/get-pool-results');

async function test() {
    try {
        console.log("Testing getAllCourses...");
        const courses = await getAllCourses();
        console.log("Found", courses.length, "courses");

        console.log("Testing getPoolResults (mock ID)...");
        // We'll just see if it runs to the 'Round not found' error
        const pool = await getPoolResults('non-existent');
        console.log("Pool Result:", JSON.stringify(pool));
    } catch (e) {
        console.error("TEST FAILED:", e);
    }
}

test();
