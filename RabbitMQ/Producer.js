import amqp from 'amqplib';
import express from 'express';
import bodyParser from 'body-parser';
import { dbconnection } from './dbConfig.js';

const app = express();
app.use(bodyParser.json());
const port = 3001;

const url = "amqp://guest:guest@localhost:5672";
const queuename = "serverqueue";
let connection, channel;
const responseQueue = "response"; // This is the response queue name


async function sendMessage(msg) {
    try {
        // Send the message to the main queue with replyTo set to the responseQueue
        await channel.sendToQueue(queuename, Buffer.from(JSON.stringify(msg)), {
            replyTo: responseQueue,
            correlationId: msg.transactionId, // Use a proper correlation ID
        });
        console.log("Message sent to:", queuename, ": ", msg.transactionId);
    } catch (error) {
        console.log("Something Went Wrong:", error);
        return false; // Return false if something goes wrong
    }
}



app.post('/testrabbit', async(req, res) => {
    const { username, msisdn, cnic, transactionId, param1, param2, param3, param4 } = req.body;

    if (!username || !msisdn || !cnic || !transactionId) {
        return res.status(400).json({ error: "USERNAME, MSISDN, CNIC, and TRANSACTIONID are required" });
    }

    // Add replyTo to the request data
    const requestData = { ...req.body, replyTo: responseQueue };

    await sendMessage(requestData);
    // await channel.consume(responseQueue, (responseMsg) => {
    //     const response = JSON.parse(responseMsg.content.toString());
    //     if (responseMsg.properties.correlationId === transactionId) {
    //         console.log("Here")
    //         // Send the response back to the client
    //         res.status(200).json(JSON.parse(responseMsg.content.toString()));
    //         channel.ack(responseMsg); // Acknowledge the response message
    //     }
    // }, { noAck: false });
    // res.status(200).send("Already Exists in DB")
});

app.listen(port, async () => {
    try {
        console.log("[+] - Server Listening on Port:", port);
        connection = await amqp.connect(url);
        console.log("[+] - Connection to RabbitMQ Successfull.");
        channel = await connection.createChannel();
        console.log("[+] - Channel Creation at RabbitMQ Successfull.");
        await channel.assertQueue(queuename);
        console.log("[+] - Queue Creation at RabbitMQ Successfull.");
        await channel.assertQueue(responseQueue);
        console.log("[+] - Response Queue Creation at Rabbit Queue Successfull.")
        dbconnection.connect((err) =>{
            if(err){
                console.error("[+] - Error Connection to Database.")
                return
            }
            console.log("[+] - Connected to MySQL Database.")
        })
    } catch (error) {
        console.error("Error starting server:", error);
    }
});