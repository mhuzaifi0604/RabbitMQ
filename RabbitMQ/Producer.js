import amqp from 'amqplib';
import express from 'express';
import bodyParser from 'body-parser';
import { dbconnection } from './dbConfig.js';

const app = express();
app.use(bodyParser.json());
const port = 3001;

const url = "amqp://guest:guest@localhost:5672";
const queuename = "serverqueue";
const responseQueue = "response"; // Response queue name
let connection, channel;
const processedTransactions = new Set(); // Set to keep track of processed transaction IDs

async function sendMessage(msg, res) {
    try {
        // Check if the transaction ID has already been processed
        if (processedTransactions.has(msg.transactionId)) {
            return res.status(200).json({ message: "Duplicate request received; transaction already processed." });
        }

        // Mark the transaction ID as processed
        processedTransactions.add(msg.transactionId);

        // Send the message to the main queue
        const response = await channel.sendToQueue(queuename, Buffer.from(JSON.stringify(msg)), {
            replyTo: msg.replyTo,
            correlationId: msg.transactionId, // Use a proper correlation ID
        });

        return new Promise((resolve, reject) => {
            channel.consume(msg.replyTo, (responseMsg) => {
                if (responseMsg.properties.correlationId === msg.transactionId) {
                    const response = JSON.parse(responseMsg.content.toString());
                    res.status(200).send(response);
                    channel.ack(responseMsg);
                    resolve(response); // Resolve the promise with the response
                }
            }, { noAck: false });
        });

    } catch (error) {
        console.log("Something Went Wrong:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

app.post('/testrabbit', async (req, res) => {
    const { username, msisdn, cnic, transactionId, param1, param2, param3, param4 } = req.body;

    if (!username || !msisdn || !cnic || !transactionId) {
        return res.status(400).json({ error: "USERNAME, MSISDN, CNIC, and TRANSACTIONID are required" });
    }

    // Add replyTo to the request data
    const requestData = { ...req.body, replyTo: responseQueue };

    await sendMessage(requestData, res);
});

app.listen(port, async () => {
    try {
        console.log("[+] - Server Listening on Port:", port);
        connection = await amqp.connect(url);
        console.log("[+] - Connection to RabbitMQ Successful.");
        channel = await connection.createChannel();
        console.log("[+] - Channel Creation at RabbitMQ Successful.");
        await channel.assertQueue(queuename);
        console.log("[+] - Queue Creation at RabbitMQ Successful.");
        await channel.assertQueue(responseQueue);
        console.log("[+] - Response Queue Creation at RabbitMQ Successful.");
        dbconnection.connect((err) => {
            if (err) {
                console.error("[+] - Error Connection to Database.")
                return;
            }
            console.log("[+] - Connected to MySQL Database.")
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
});
