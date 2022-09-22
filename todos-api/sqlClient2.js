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

    create (id, req, res, callback) {
        const username = req.user.username
        this._createTable(username)
        var sqlStmt = "INSERT into " + username + " VALUES (@ID, @Message);"
        var request = new sql.Request();
        const connect = this._connect
        try {
            request.input('Message', sql.VarChar(100), req.body.content).input('ID', sql.Int, id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[create] ' + err);
                    connect('[create1]')
                    callback(id, req, res, false)
                } else {
                    callback(id, req, res, true)
                }
            });
        } catch(err) {
            console.log('[create::catch]');
            console.log(err);
            connect('[create2]')
            callback(id, req, res, false)
        }
    }

    delete (username, id_str, res, callback) {
        var sqlStmt = "DELETE from " + username + " where ID = @ID";
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
                    callback(username, id, res, 204);
                } else {
                    callback(username, id, res, 204);
                }
            });
        } catch(err) {
            console.log('[delete::catch]');
            console.log(err)
            connect('[delete2]')
            callback(username, id, res, 204);
        }
    }

    list (username, res, callback) {
        this._createTable(username)
        var sqlStmt = "SELECT * from " + username + ";"
        var request = new sql.Request();
        var data = {}
        const connect = this._connect
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[list]' + err);
                    connect('[list1]')
                    callback(data, res)
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
            callback(data, res)
        }
    }

    _createTable(username) {
        var sqlStmt = "if OBJECT_ID ('" + username + "', 'U') is null CREATE TABLE " + username + "(ID int, Message varchar(100));"
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

    getNextId(req, res, mutex, cache, createTodo) {
        var username = req.user.username
        var sqlStmt = "SELECT Max(ID) as id from " + username + ";"
        var request = new sql.Request();
        const connect = this._connect
        const create = this.create
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    cache.put(username, 2)
                    mutex.release()
                    console.log('[getNextId]' + err)
                    connect('[getNextId1]')
                    create(1, req, res, createTodo)
                } else {
                    const id = result.recordsets[0][0].id+1
                    cache.put(username, id+1)
                    mutex.release()
                    create(id, req, res, createTodo)
                }
            });
        } catch (err) {
            cache.put(username, 2)
            mutex.release()
            console.log('[getNextId::catch]')
            console.log(err)
            connect('[getNextId2]')
            create(1, req, res, createTodo)
        }
    }
}

module.exports = SqlClient
