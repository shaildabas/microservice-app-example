'use strict';

var Mutex = require('async-mutex').Mutex;

const cache = require('memory-cache');
const cache2 = require('memory-cache');
const {Annotation, 
    jsonEncoder: {JSON_V2}} = require('zipkin');
const SqlClient = require('./sqlClient2');

const OPERATION_CREATE = 'CREATE',
      OPERATION_DELETE = 'DELETE';

class TodoControllerSql {
    constructor({tracer, redisClient, logChannel}) {
        this._tracer = tracer;
        this._redisClient = redisClient;
        this._logChannel = logChannel;
        this._mutex = new Mutex();
        this._client = new SqlClient();
    }

    // TODO: these methods are not concurrent-safe
    list (req, res) {
        console.log("UserName: " + req.user.username)
        this._client.list(req.user.username, res, function(data, res) {
            res.json(data)
        });
    }

    create (req, res) {
        // TODO: must be transactional and protected for concurrent access, but
        // the purpose of the whole example app it's enough
        const username = req.user.username
        console.log("Name: " + req.user.username)
        createTodo = this._createTodo
        this._mutex.acquire()
        var id = cache.get(userID)
        if (id == null) {
            console.log('[create] Id mising')
            this._client.getNextId(req, res, this._mutex, cache, createTodo)
        } else {
            cache.put(req.user.username, id+1)
            console.log('[create] Using id: ' + id)
            this._mutex.release()
            this._client.create(id, req, res, createTodo)
        }
    }

    _createTodo (id, req, res, success) {
        if (success) {
            console.log('[createTodo] todo with id ' + id + ' created successfully')
            var data = {}
            const todo = {
                content: req.body.content,
                id: id
            }
            data[id] = todo
            this._logOperation(OPERATION_CREATE, req.user.username, id)
            res.json(data)
        } else {
            console.log('[createTodo] failed to create todo with id ' + id)
            res.json({})
        }
    }

    delete (req, res) {
        console.log("Name: " + req.user.username + " taskId: " + req.params.taskId)
        logOperation = this._logOperation
        this._client.delete(req.user.username, req.params.taskId, res, function(username, id, res, code) {
            logOperation(OPERATION_DELETE, username, id)
            res.status(code)
            res.send()
        });
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
}

module.exports = TodoControllerSql
