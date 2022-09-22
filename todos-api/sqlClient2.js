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
    constructor () {
        this._connect('[constructor]')
    }

    _connect(msg) {
        console.log(msg + " [_connect] User " + config.user + " connecting to " + config.database + " on " + config.server)
        try {
            sql.connect(config, function (err) {
                if (err) {
                    console.log(msg + ' [_connect] ' + err);
                } else {
                    console.log(msg + ' [_connect] Connected');
                }
            });
        } catch (err) {
            console.log(msg + ' [_connect::catch]');
            console.log(err);
        }
    }

    create (tableName, todo) {
        this._createTable(tableName)
        var sqlStmt = "INSERT into " + tableName + " VALUES (@ID, @Message);"
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
            console.log('[create::catch]');
            console.log(err);
            connect('[create2]')
        }
    }

    delete (tableName, id_str) {
        var sqlStmt = "DELETE from " + tableName + " where ID = @ID";
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

    list (tableName, res, callback) {
        this._createTable(tableName)
        var sqlStmt = "SELECT * from " + tableName + ";"
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

    _createTable(tableName) {
        var sqlStmt = "if OBJECT_ID ('" + tableName + "', 'U') is null CREATE TABLE " + tableName + "(ID int, Message varchar(100));"
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

    getNextId(tableName, callback) {
        var sqlStmt = "SELECT Max(ID) as id from " + tableName + ";"
        var request = new sql.Request();
        const connect = this._connect
        try{
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[getNextId]' + err)
                    connect('[getNextId1]')
                } else {
                    callback(tableName, result.recordsets[0][0].id)
                }
            });
        } catch (err) {
            console.log('[getNextId::catch]')
            console.log(err)
            connect('[getNextId2]')
        }
    }
}

module.exports = SqlClient
