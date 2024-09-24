import express from 'express'
import mysql from 'mysql2'
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

// Middleware to parse JSON data from requests
app.use(bodyParser.json());

// Create a MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',           // Replace with your MySQL username
    password: '20i0604',   // Replace with your MySQL password
    database: 'CMPA_Transactions_Record',  // Replace with your database name
    port: 6969
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Route to post data into the 'users' table
app.post('/adduser', (req, res) => {
    const { username, msisdn, cnic, transactionId, param1, param2, param3, param4 } = req.body;

    if (!username || !msisdn || !cnic || !transactionId) {
        return res.status(400).json({ error: "USERNAME, MSISDN, CNIC, and TRANSACTIONID are required" });
    }

    const insertQuery = `
    INSERT INTO CMPATRANSACTION (USERNAME, MSISDN, CNIC, TRANSACTIONID, PARAM1, PARAM2, PARAM3, PARAM4)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;
connection.query(insertQuery, [username, msisdn, cnic, transactionId, param1 || null, param2 || null, param3 || null, param4 || null], (err, results) => {
    if (err) {
        console.error('Error inserting data:', err);
        return connection.rollback(() => {
            return res.status(500).json({ error: 'Failed to insert data' });
        });
    }
    res.status(201).json({ message: 'Transaction added successfully' });
    console.log("Added Successfully");
});
})

app.post('/addUnique', (req, res) => {
    const { username, msisdn, cnic, transactionId, param1, param2, param3, param4 } = req.body;

    // Ensure required fields are provided
    if (!username || !msisdn || !cnic || !transactionId) {
        return res.status(400).json({ error: "USERNAME, MSISDN, CNIC, and TRANSACTIONID are required" });
    }

    // Begin a transaction
    connection.beginTransaction(err => {
        if (err) {
            console.error("Error starting transaction:", err);
            return res.status(500).json({ error: 'Failed to start transaction' });
        }

        // Check if a transaction with the same TRANSACTIONID already exists
        const checkQuery = 'SELECT TRANSACTIONID FROM CMPATRANSACTION WHERE TRANSACTIONID = ? FOR UPDATE'; // FOR UPDATE to lock row

        connection.query(checkQuery, [transactionId], (err, results) => {
            if (err) {
                console.log("Error checking existing transaction ID:", err);
                connection.rollback(() => {
                    return res.status(500).json({ error: 'Failed to check existing transaction' });
                });
            }

            // If a record with the same TRANSACTIONID exists, return an error
            if (results.length > 0) {
                connection.rollback(() => {
                    return res.status(409).json({ message: "Transaction with this TRANSACTIONID already exists" });
                });
            }

            // If no existing record is found, proceed to insert the new transaction
            const insertQuery = `
                INSERT INTO CMPATRANSACTION (USERNAME, MSISDN, CNIC, TRANSACTIONID, PARAM1, PARAM2, PARAM3, PARAM4)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            connection.query(insertQuery, [username, msisdn, cnic, transactionId, param1 || null, param2 || null, param3 || null, param4 || null], (err, results) => {
                if (err) {
                    console.error('Error inserting data:', err);
                    return connection.rollback(() => {
                        return res.status(500).json({ error: 'Failed to insert data' });
                    });
                }

                // Commit the transaction after successful insertion
                connection.commit(err => {
                    if (err) {
                        connection.rollback(() => {
                            console.error("Error committing transaction:", err);
                            return res.status(500).json({ error: 'Failed to commit transaction' });
                        });
                    }

                    // Return success response with the new record's ID
                    res.status(201).json({ message: 'Transaction added successfully' });
                    console.log("Added Successfully");
                });
            });
        });
    });
});



// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
