const knex = require('knex');

const database = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    },
    pool: {
        afterCreate: function (connection, callback) {
            connection.query('SET timezone = \'Europe/Paris\'', function (err) {
                callback(err, connection);
            });
        }
    }
});

module.exports = database;
