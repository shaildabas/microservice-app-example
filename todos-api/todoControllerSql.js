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
        this._client.list(req.user.username, res, this.listReturn)
    }
    
    listReturn (data, res) {
        console.log('[listResult] data:')
        console.log(data)
        res.json(data)
    }

    create (req, res) {
        // TODO: must be transactional and protected for concurrent access, but
        // the purpose of the whole example app it's enough
        console.log("Name: " + req.user.username)
        var nextId = this._getNextId(req.user.username)
        const id = nextId
        const todo = {
            content: req.body.content,
            id: id
        }
        nextId++
        this._client.create(req.user.username, todo)
        this._setNextId(req.user.username, nextId)
        this._logOperation(OPERATION_CREATE, req.user.username, id)
        res.json({id: todo})
    }

    delete (req, res) {
        console.log("Name: " + req.user.username + " taskId: " + req.params.taskId)
        this._client.delete(req.user.username, req.params.taskId)
        this._logOperation(OPERATION_DELETE, req.user.username, req.params.taskId)
        res.status(204)
        res.send()
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
    
    _getNextId (userID) {
        var nextId = cache.get(userID)
        if (nextId == null) {
            this._mutex.acquire();
            nextId = cache.get(userID)
            if (nextId == null) {
                this._client.getNextId(userID, this._setNextId)
                this._setNextId(userID, nextId)
            }
            this._mutex.release();
        }
        return nextId
    }

    _setNextId (userID, nextId) {
        cache.put(userID, nextId)
    }
}

module.exports = TodoControllerSql
