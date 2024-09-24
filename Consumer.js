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

async function recvMessage() {
    try {
        await channel.assertQueue(queuename);
        await channel.consume(queuename, async (msg) => {
            const { username, msisdn, cnic, transactionId, param1, param2, param3, param4 } = JSON.parse(msg.content.toString());
            console.log("Message received from", queuename, ":", transactionId);

            try {
                dbconnection.beginTransaction();

                const checkQuery = 'SELECT TRANSACTIONID FROM CMPATRANSACTION WHERE TRANSACTIONID = ? FOR UPDATE';
                dbconnection.query(checkQuery, [transactionId], (err, results) => {
                    if (err) {
                        console.error("Error checking existing transaction ID:", err);
                        return dbconnection.rollback(() => {
                            channel.nack(msg);
                        });
                    }
                    console.log("Results Length:", results.length)
                    if (results.length > 0) {
                        console.log("Transaction ID already exists:", transactionId);
                        channel.ack(msg);
                    } else {
                        const insertQuery = `
                            INSERT INTO CMPATRANSACTION (USERNAME, MSISDN, CNIC, TRANSACTIONID, PARAM1, PARAM2, PARAM3, PARAM4)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        dbconnection.query(insertQuery, [username, msisdn, cnic, transactionId, param1 || null, param2 || null, param3 || null, param4 || null], (err) => {
                            if (err) {
                                console.error('Error inserting data:', err);
                                return dbconnection.rollback(() => {
                                    channel.nack(msg);
                                });
                            }

                            console.log("Added Successfully");

                            dbconnection.commit(err => {
                                if (err) {
                                    console.error('Commit error:', err);
                                    return dbconnection.rollback(() => {
                                        channel.nack(msg);
                                    });
                                }

                                // Send response back to the producer
                                const responseMessage = { status: 'success', transactionId };
                                channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(responseMessage)), {
                                    correlationId: msg.properties.correlationId,
                                });
                                channel.ack(msg);
                            });
                        });
                    }
                });
            } catch (error) {
                console.error("Something Went Wrong in processing:", error);
                channel.nack(msg);
            }
            console.log("Waiting for Messages in queue:", queuename);
        });
    } catch (error) {
        console.log("Something Went Wrong:", error);
    }
}

recvMessage();
