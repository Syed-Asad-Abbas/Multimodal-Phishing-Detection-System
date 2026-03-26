const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:root@localhost:5432/fyp_db",
});

async function findLocation() {
    try {
        await client.connect();
        const res = await client.query('SHOW data_directory;');
        console.log('PostgreSQL Data Directory:', res.rows[0].data_directory);

        // Also try to find the specific database OID which maps to a folder
        const dbRes = await client.query("SELECT oid, datname FROM pg_database WHERE datname = 'fyp_db';");
        console.log('Database Name:', dbRes.rows[0].datname);
        console.log('Database OID (Folder Name):', dbRes.rows[0].oid);
        console.log('Full Path (Likely):', `${res.rows[0].data_directory}/base/${dbRes.rows[0].oid}`);
    } catch (err) {
        console.error('Error finding DB location:', err);
    } finally {
        await client.end();
    }
}

findLocation();
