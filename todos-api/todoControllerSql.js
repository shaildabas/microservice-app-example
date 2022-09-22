'use strict';

var Mutex = require('async-mutex').Mutex;

const cache = require('memory-cache');
const cache2 = require('memory-cache');
const {Annotation, 
    jsonEncoder: {JSON_V2}} = require('zipkin');

const OPERATION_CREATE = 'CREATE',
      OPERATION_DELETE = 'DELETE';

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

var mutex = new Mutex();

class TodoControllerSql {
    constructor({tracer, redisClient, logChannel}) {
        this._tracer = tracer;
        this._redisClient = redisClient;
        this._logChannel = logChannel;
        this._connect('[constructor]', this._createTables, this._createTable);
    }

    // TODO: these methods are not concurrent-safe
    list (req, res) {
        console.log("UserName: " + req.user.username)
        this._getTodos(req.user.username, res, function(data, res) {
            res.json(data)
        });
    }

    create (req, res) {
        // TODO: must be transactional and protected for concurrent access, but
        // the purpose of the whole example app it's enough
        const username = req.user.username
        createTodo = this._createTodo
        mutex.acquire()
        var id = cache.get(userID)
        if (id == null) {
            console.log('[create] Id for ' + username + ' is mising')
            mutex.release()
            res.status(402)
            res.send()
        } else {
            cache.put(username, id+1)
            console.log('[create] Using id: ' + id)
            mutex.release()

            var data = {}
            const todo = {
                content: req.body.content,
                id: id
            }
            data[id] = todo
            logOperation = this._logOperation
            this._createTodo(id, req, res, function(success) {
                if (success) {
                    console.log('[createTodo] todo with id ' + id + ' created successfully')
                    logOperation(OPERATION_CREATE, username, id)
                    res.json(data)
                } else {
                    console.log('[createTodo] failed to create todo with id ' + id)
                    res.json({})
                }
            });
        }
    }

    delete (req, res) {
        console.log("Name: " + req.user.username + " taskId: " + req.params.taskId)
        logOperation = this._logOperation
        this._deleteTodo(req.user.username, parseInt(req.params.taskId), res);
    }

    _logOperation (opName, username, todoId) {
        this._tracer.scoped(() => {
            const traceId = this._tracer.id;
            this._redisClient.publish(this._logChannel, JSON.stringify({
                zipkinSpan: traceId,
                opName: opName,
                username: username,
                todoId: todoId,
            }))
        })
    }

    ///////////////////////////SQL methods//////////////////
    
    _connect(msg, createTables, createTable) {
        console.log(msg + " [_connect] User " + config.user + " connecting to " + config.database + " on " + config.server)
        try {
            sql.connect(config, function (err) {
                if (err) {
                    console.log(msg + ' [_connect] ' + err);
                } else {
                    console.log(msg + ' [_connect] Connected');
                    createTables(createTable)
                }
            });
        } catch (err) {
            console.log(msg + ' [_connect::catch]');
            console.log(err);
        }
    }

    _createTable(username) {
        console.log('[createTable] creating table ' + username)
        var sqlStmt = "if OBJECT_ID ('" + username + "', 'U') is null CREATE TABLE " + username + "(ID int, Message varchar(100));"
        var request = new sql.Request();
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_createTable]' + err);
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
        }
    }
   
    _createTables(createTable) {
        console.log('[createTables] creating tables')
        createTable('admin')
        createTable('johnd')
        createTable('janed')
    }

    _getTodos (username, res, returnResult) {
        var sqlStmt = "SELECT * from " + username + ";"
        var request = new sql.Request();
        var data = {}
        const connect = this._connect
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_getToDos]' + err);
                    connect('[_getToDos]', () => {})
                    returnResult(data, res)
                } else {
                    console.log(result.recordset.length + ' todos are there');
                    var maxId = 0
                    for (const items of result.recordsets) {
                        for (const item of items) {
                            if (maxId < item.ID) maxId = item.ID;
                            const todo = {
                                id: item.ID,
                                content: item.Message
                            }
                            data[item.ID] = todo
                        }
                    }
                    mutex.acquire();
                    if (cache.get(username) == null) cache.put(username, maxId+1);
                    mutex.release();
                }
                returnResult(data, res)
            });
        } catch(err) {
            console.log('[_getToDos::catch]');
            console.log(err);
            connect('[_getToDos]', () => {})
            returnResult(data, res)
        }
    }

    _deleteTodo (username, id, res) {
        var sqlStmt = "DELETE from " + username + " where ID = @ID";
        var request = new sql.Request();
        console.log('[_deleteTodo] Deleting todo with id ' + id);
        const connect = this._connect
        const logOperation = this._logOperation
        try {
            request.input('ID', sql.Int, id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_deleteTodo] ' + err);
                    connect('[_deleteTodo]', () => {})
                    res.status(404)
                    res.send()
                } else {
                    logOperation(OPERATION_DELETE, username, id)
                    res.status(204)
                    res.send()
                }
            });
        } catch(err) {
            console.log('[_deleteTodo::catch]');
            console.log(err)
            connect('[_deleteTodo]', () => {})
            res.status(404)
            res.send()
        }
    }

    _createTodo (id, req, returnResult) {
        const username = req.user.username
        var sqlStmt = "INSERT into " + username + " VALUES (@ID, @Message);"
        var request = new sql.Request();
        const connect = this._connect
        try {
            request.input('Message', sql.VarChar(100), req.body.content).input('ID', sql.Int, id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_createTodo] ' + err);
                    connect('[_createTodo]', ()=>{})
                    returnResult(false)
                } else {
                    returnResult(true)
                }
            });
        } catch(err) {
            console.log('[_createTodo::catch]');
            console.log(err);
            connect('[_createTodo]', ()=>{})
            returnResult(false)
        }
    }
}

module.exports = TodoControllerSql
