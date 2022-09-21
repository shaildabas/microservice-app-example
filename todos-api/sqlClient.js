var sql = require('mssql');
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
        this._connected = false
        this._connect()
        //this._createTable()
        this._lastUsedID = 0
    }

    _connect() {
        if (this._connected == true)    return;
        var connected = true
        console.log("User " + process.env.DB_USER + " connecting to " + process.env.DB_NAME + " on " + process.env.DB_HOST)
        try {
            sql.connect(config, function (err) {
                connected = true;
                if (err) {
                    console.log('[_connect] ' + err);
                    connected = false
                }
            });
            console.log('Connected, creating table');
        } catch (err) {
            console.log('[_connect::catch]');
            console.log(err);
            connected = false;
        }
        this._connected = connected
    }

    create (todo) {
        this._connect()
        var sqlStmt = "INSERT into " + this._table + " VALUES (@ID, @Message);"
        var request = new sql.Request();
        this._lastUsedID = todo.id;
        var connected = true
        try {
            request.input('Message', sql.VarChar(100), todo.content).input('ID', sql.Int, todo.id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[create] ' + err);
                    connected = false;
                }
                console.log(result);
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            connected = false
        }
        this._connected = connected
    }

    delete (id_str) {
        this._connect()
        var sqlStmt = "DELETE from " + this._table + " where ID = @ID";
        var request = new sql.Request();
        var id = parseInt(id_str);
        console.log(id_str);
        console.log(id);
        var connected =true
        try {
            request.input('ID', sql.Int, id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[delete] ' + err);
                    connected = false
                }
            });
        } catch(err) {
            console.log('[delete::catch]');
            console.log(err);
            onnected = false
        }
        this._connected = connected
    }

    list (res, callback) {
        this._connect()
        var sqlStmt = "SELECT * from " + this._table + ";"
        var request = new sql.Request();
        var data = {}
        var connected = true
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[list]' + err);
                    connected = false
                }
                console.log(result.recordset.length + ' todos are there');
                for (const items of result.recordsets) {
                    for (const item of items) {
                        const todo = {
                            id: item.ID,
                            content: item.Message
                        }
                        data[item.ID] = todo
                    }
                }
                console.log('Data:')
                console.log(data)
                callback(data, res)
            });
        } catch(err) {
            console.log('[list::catch]');
            console.log(err);
            connected = false
        }
        this._connected = connected
    }

    _createTable() {
        this._connect()
        //var sqlStmt = "if OBJECT_ID ('" + this._table + "', 'U') is null CREATE TABLE " + this._table + "(ID int, Message varchar(100));"
        var sqlStmt = "if OBJECT_ID ('demotable4', 'U') is null create table dbo.demotable4 (c1 int, c2 varchar(100));"
        var request = new sql.Request();
        var connected = true
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_createTable]' + err);
                    connected = false
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            connected = false
        }
        this._connected = connected;
    }

    getNextID() {
        var id = this._lastUsedID + 1
        return id
    }

    _getLastID() {
        return 3;
        var sqlStmt = "SELECT MAX(ID) from " + this._table + ";"
        var request = new sql.Request();
        var last = 0;
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) console.log('[_getLastID] ' + err);
                console.log('[_getLastID]' + result.recordset[0]);
                last = result.recordset[0];
            });
        } catch(err) {
            console.log('[_getLastID::catch]');
            console.log(err);
        }
        return last;
    }
}

module.exports = SqlClient
