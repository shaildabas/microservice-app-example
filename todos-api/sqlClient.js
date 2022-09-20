var sql = require("mssql");
var config = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

class SqlClient {
    constructor (userName) {
        this._table = userName;
        this._connect();
        this._lastUsedID = this._getLastID()
    }

    _connect() {
        console.log("User " + process.env.DB_USER + " connecting to " + process.env.DB_NAME + " on " + process.env.DB_HOST)
        sql.connect(config, function (err) {
            if (err) console.log(err);
        });
        this._createTable()
    }

    create (todo) {
        var sqlStmt = "INSERT " + this._table + " (ID, Message) VALUES @ID, @Message;"
        var request = new sql.Request();
        request.input('ID', sql.Int, todo.id).input('Message', sql.varchar(100), todo.content).query(sqlStmt, function(err, result) {
            if (err) console.log(err);
            return result.recordset;
        });
        this._lastUsedID = id;
    }

    delete (id) {
        var sqlStmt = "DELETE from " + this._table + " where ID = @ID";
        var request = new sql.Request();
        request.input('ID', sql.Int, id).query(sqlStmt, function(err, result) {
            if (err) console.log(err);
            return result.recordset;
        });
    }

    list () {
        var sqlStmt = "SELECT ID, Message from " + this._table + ";"
        var request = new sql.Request();
        request.query(sqlStmt, function(err, result) {
            if (err) console.log(err);
            return result.recordset;
        });
    }

    _createTable() {
        var sqlStmt = "if OBJECT_ID ('" + this._table + "', 'U') is null CREATE TABLE " + this._table + "(ID int, Message varchar(100));"var request = new sql.Request();
        request.query(sqlStmt, function(err, result) {
            if (err) {
                console.log(err);
            }
        });
    }

    getNextID() {
        var id = this._lastUsedID + 1
        return id
    }

    _getLastID() {
        var sqlStmt = "SELECT MAX(ID) from " + this._table + ";"
        var request = new sql.Request();
        var last = 0;
        request.query(sqlStmt, function(err, result) {
            if (err) console.log(err);
            console.log('[_getLastID]' + result.recordset[0]);
            last = result.recordset[0];
        });
        return last;
    }
}

module.exports = SqlClient