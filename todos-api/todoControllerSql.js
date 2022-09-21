'use strict';
const cache = require('memory-cache');
const {Annotation, 
    jsonEncoder: {JSON_V2}} = require('zipkin');
const SqlClient = require('./sqlClient');

const OPERATION_CREATE = 'CREATE',
      OPERATION_DELETE = 'DELETE';

class TodoControllerSql {
    constructor({tracer, redisClient, logChannel}) {
        this._tracer = tracer;
        this._redisClient = redisClient;
        this._logChannel = logChannel;
    }

    // TODO: these methods are not concurrent-safe
    list (req, res) {
        console.log("UserName: " + req.user.username)
        const client = this._getSqlClient(req.user.username).client
        client.list(res, this.listReturn)
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
        var data = this._getSqlClient(req.user.username)
        const client = data.client
        const id = data.nextId
        const todo = {
            content: req.body.content,
            id: id
        }
        data.nextId++
        client.create(todo)
        this._setSqlClient(req.user.username, data)
        this._logOperation(OPERATION_CREATE, req.user.username, id)
        res.json(todo)
    }

    delete (req, res) {
        console.log("Name: " + req.user.username + " taskId: " + req.params.taskId)
        var data = this._getSqlClient(req.user.username)
        var client = data.client
        client.delete(req.params.taskId)
        this._setSqlClient(req.user.username, data)
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

    
    _getSqlClient (userID) {
        var data = cache.get(userID)
        if (data == null) {
            data = {
                nextId: 1,
                client: new SqlClient(userID)
            }
            this._setSqlClient(userID, data)
        }
        return data
    }

    _setSqlClient (userID, data) {
        cache.put(userID, data)
    }
}

module.exports = TodoControllerSql
