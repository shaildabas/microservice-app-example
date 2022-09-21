var sql = require('mssql');
var config = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    pool: {
        max: 10,
        min: 1,
        idleTimeoutMillis: 300000
    },
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

class SqlClient {
    constructor (userName) {
        this._table = userName;
        this._connect('[constructor]')
        //setTimeout(this._fireDummy, 5000)
        console.log('Connected, creating table');
        this._createTable()
    }

    _connect(msg) {
        console.log(msg + " [_connect] User " + process.env.DB_USER + " connecting to " + process.env.DB_NAME + " on " + process.env.DB_HOST)
        try {
            /*sql.connect(config, function (err) {
                if (err) {
                    console.log(msg + ' [_connect] ' + err);
                } else {
                    console.log(msg + ' [_connect] Connected');
                }
            });*/
            sql.connect(config);
        } catch (err) {
            console.log(msg + ' [_connect::catch]');
            console.log(err);
        }
    }

    _fireDummy() {
        console.log('[_fireDummy]');
    }

    create (todo) {
        this._createTable()
        var sqlStmt = "INSERT into " + this._table + " VALUES (@ID, @Message);"
        var request = new sql.Request();
        const connect = this._connect
        try {
            request.input('Message', sql.VarChar(100), todo.content).input('ID', sql.Int, todo.id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[create] ' + err);
                    connect('[create1]')
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            connect('[create2]')
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
                    connect('[delete1]')
                }
            });
        } catch(err) {
            console.log('[delete::catch]');
            console.log(err)
            connect('[delete2]')
        }
    }

    list (res, callback) {
        this._createTable()
        var sqlStmt = "SELECT * from " + this._table + ";"
        var request = new sql.Request();
        var data = {}
        const connect = this._connect
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[list]' + err);
                    connect('[list1]')
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
                }
                callback(data, res)
            });
        } catch(err) {
            console.log('[_getToDos::catch]');
            console.log(err);
            connect('[list2]')
        }
    }

    _createTable() {
        var sqlStmt = "if OBJECT_ID ('" + this._table + "', 'U') is null CREATE TABLE " + this._table + "(ID int, Message varchar(100));"
        //var sqlStmt = "if OBJECT_ID ('demotable5', 'U') is null create table dbo.demotable5 (c1 int, c2 varchar(100));"
        var request = new sql.Request();
        const connect = this._connect
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_createTable]' + err);
                    connect('[_createTable1]')
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            connect('[_createTable2]')
        }
    }
}

module.exports = SqlClient
