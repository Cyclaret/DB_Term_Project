// connection pool을 사용해 DB 연결을 재사용한다.

require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // MySQL 컨테이너의 UTC DATETIME을 서버 로컬 시간으로 해석하지 않는다.
    timezone: 'Z',

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;