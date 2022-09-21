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
        this._connect()
        this._fireDummy()
    }

    _connect() {
        console.log("[_connect] User " + process.env.DB_USER + " connecting to " + process.env.DB_NAME + " on " + process.env.DB_HOST)
        try {
            sql.connect(config, function (err) {
                if (err) {
                    console.log('[_connect] ' + err);
                } else {
                    console.log('[_connect] Connected');
                }
            });
            console.log('Connected, creating table');
        } catch (err) {
            console.log('[_connect::catch]');
            console.log(err);
        }
    }

    _fireDummy() {
        var sqlStmt = "SELECT * from " + this._table + ";"
        var request = new sql.Request();
        const connect = this._connect
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[list]' + err);
                    connect()
                }
            });
        } catch (err) {
            console.log('[_fireDummy]')
            console.log(err)
            connect()
        }
    }

    create (todo) {
        this._connect()
        var sqlStmt = "INSERT into " + this._table + " VALUES (@ID, @Message);"
        var request = new sql.Request();
        this._nextID = todo.id+1;
        const connect = this._connect
        try {
            request.input('Message', sql.VarChar(100), todo.content).input('ID', sql.Int, todo.id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[create] ' + err);
                    connect()
                } else {
                    console.log(result);
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            connect()
        }
    }

    delete (id_str) {
        var sqlStmt = "DELETE from " + this._table + " where ID = @ID";
        var request = new sql.Request();
        var id = parseInt(id_str);
        console.log(id_str);
        console.log(id);
        const connect = this._connect
        try {
            request.input('ID', sql.Int, id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[delete] ' + err);
                    connect()
                }
            });
        } catch(err) {
            console.log('[delete::catch]');
            console.log(err)
            connect()
        }
    }

    list (res, callback) {
        var sqlStmt = "SELECT * from " + this._table + ";"
        var request = new sql.Request();
        var data = {}
        const connect = this._connect
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[list]' + err);
                    connect()
                } else {
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
                }
                callback(data, res)
            });
        } catch(err) {
            console.log('[_getToDos::catch]');
            console.log(err);
            connect()
        }
    }

    _createTable() {
        this._connect()
        //var sqlStmt = "if OBJECT_ID ('" + this._table + "', 'U') is null CREATE TABLE " + this._table + "(ID int, Message varchar(100));"
        var sqlStmt = "if OBJECT_ID ('demotable4', 'U') is null create table dbo.demotable4 (c1 int, c2 varchar(100));"
        var request = new sql.Request();
        const connect = this._connect
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_createTable]' + err);
                    connect()
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            connect()
        }
    }
}

module.exports = SqlClient
