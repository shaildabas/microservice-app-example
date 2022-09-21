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
        this._nextID = this._getLastID2()+1
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

    create (todo) {
        this._connect()
        var sqlStmt = "INSERT into " + this._table + " VALUES (@ID, @Message);"
        var request = new sql.Request();
        this._nextID = todo.id+1;
        try {
            request.input('Message', sql.VarChar(100), todo.content).input('ID', sql.Int, todo.id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[create] ' + err);
                    this._connect()
                } else {
                    console.log(result);
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            this._connect()
        }
    }

    delete (id_str) {
        var sqlStmt = "DELETE from " + this._table + " where ID = @ID";
        var request = new sql.Request();
        var id = parseInt(id_str);
        console.log(id_str);
        console.log(id);
        try {
            request.input('ID', sql.Int, id).query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[delete] ' + err);
                    this._connect()
                }
            });
        } catch(err) {
            console.log('[delete::catch]');
            console.log(err)
            this._connect()
        }
    }

    list (res, callback) {
        const data = this._getToDos(this._connect)
        console.log('[list] Data:')
        console.log(data)
        callback(data, res)
    }

    _getToDos(connect) {
        var sqlStmt = "SELECT * from " + this._table + ";"
        var request = new sql.Request();
        var data = {}
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
                return data
            });
        } catch(err) {
            console.log('[_getToDos::catch]');
            console.log(err);
            connect()
        }
    }

    _getLastID2() {
        const data = this._getToDos(this._connect)
        var maxId = 0
        for (const item of data.items()) {
            if (item.id > maxId) maxId = item.id
        }
        return maxId
    }

    _createTable() {
        this._connect()
        //var sqlStmt = "if OBJECT_ID ('" + this._table + "', 'U') is null CREATE TABLE " + this._table + "(ID int, Message varchar(100));"
        var sqlStmt = "if OBJECT_ID ('demotable4', 'U') is null create table dbo.demotable4 (c1 int, c2 varchar(100));"
        var request = new sql.Request();
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_createTable]' + err);
                    this._connect()
                }
            });
        } catch(err) {
            console.log('[_createTable::catch]');
            console.log(err);
            this._connect()
        }
    }

    getNextID() {
        var id = this._nextID
        return id
    }

    _getLastID() {
        var sqlStmt = "SELECT MAX(ID) from " + this._table + ";"
        var request = new sql.Request();
        var last = 0;
        this._connect()
        try {
            request.query(sqlStmt, function(err, result) {
                if (err) {
                    console.log('[_getLastID] ' + err);
                    this._connect()
                } else {
                    console.log('[_getLastID]' + result.recordset[0]);
                    last = result.recordset[0];
                }
            });
        } catch(err) {
            console.log('[_getLastID::catch]');
            console.log(err);
            this._connect()
        }
        return last;
    }
}

module.exports = SqlClient
