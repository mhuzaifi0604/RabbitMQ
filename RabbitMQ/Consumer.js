import amqp from 'amqplib';
import { dbconnection } from './dbConfig.js';

const url = "amqp://guest:guest@localhost:5672";
const queuename = "serverqueue";
const connection = await amqp.connect(url);
const channel = await connection.createChannel();

dbconnection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('[+] - Connected to MySQL database');
});

let trackedCorrelationIds = new Set(); // Changed to Set for better performance

async function recvMessage() {
    try {
        await channel.assertQueue(queuename);
        await channel.consume(queuename, async (msg) => {
            const { correlationId } = msg.properties;

            if (trackedCorrelationIds.has(correlationId)) {
                // Handle duplicate request
                channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify({ status: "Duplicate Request" })), {
                    correlationId: msg.properties.correlationId
                });
                return channel.ack(msg); // Acknowledge the duplicate message
            }

            const { username, msisdn, cnic, transactionId, param1, param2, param3, param4 } = JSON.parse(msg.content.toString());
            console.log("Message received from", queuename, ":", transactionId);

            trackedCorrelationIds.add(correlationId); // Track the correlation ID

            try {
                dbconnection.beginTransaction();

                const checkQuery = 'SELECT TRANSACTIONID FROM CMPATRANSACTION WHERE TRANSACTIONID = ? FOR UPDATE';
                dbconnection.query(checkQuery, [transactionId], (err, results) => {
                    if (err) {
                        console.error("Error checking existing transaction ID:", err);
                        return sendResponseAndNack(msg, { status: "TID Comparison Failure" });
                    }

                    console.log("Results Length:", results.length);
                    if (results.length > 0) {
                        console.log("Transaction ID already exists:", transactionId);
                        return sendResponseAndNack(msg, { status: "TID Already Exists" });
                    } else {
                        const insertQuery = `
                            INSERT INTO CMPATRANSACTION (USERNAME, MSISDN, CNIC, TRANSACTIONID, PARAM1, PARAM2, PARAM3, PARAM4)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        dbconnection.query(insertQuery, [username, msisdn, cnic, transactionId, param1 || null, param2 || null, param3 || null, param4 || null], (err) => {
                            if (err) {
                                console.error('Error inserting data:', err);
                                return sendResponseAndNack(msg, { status: "Error Inserting Transaction" });
                            }

                            console.log("Added Successfully");

                            dbconnection.commit(err => {
                                if (err) {
                                    console.error('Commit error:', err);
                                    return sendResponseAndNack(msg, { status: "Commit Error" });
                                }
                                // Successfully added
                                sendResponseAndAck(msg, { status: "TID Added Successfully" });
                            });
                        });
                    }
                });
            } catch (error) {
                console.error("Something Went Wrong in processing:", error);
                sendResponseAndNack(msg, { status: "Processing Error" });
            }
            console.log("Waiting for Messages in queue:", queuename);
        });
    } catch (error) {
        console.log("Something Went Wrong:", error);
    }
}

// Helper function to send response and acknowledge message
function sendResponseAndAck(msg, response) {
    channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(response)), {
        correlationId: msg.properties.correlationId,
    });
    channel.ack(msg);
}

// Helper function to send response and nack message
function sendResponseAndNack(msg, response) {
    channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(response)), {
        correlationId: msg.properties.correlationId,
    });
    channel.nack(msg);
}

recvMessage();
