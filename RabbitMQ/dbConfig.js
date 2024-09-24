import mysql from 'mysql2'

export const dbconnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',           // Replace with your MySQL username
    password: '20i0604',   // Replace with your MySQL password
    database: 'CMPA_Transactions_Record',  // Replace with your database name
    port: 6969
});