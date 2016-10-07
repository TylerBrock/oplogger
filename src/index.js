import 'babel-polyfill';

import EventEmitter from 'events';
import { MongoClient, Timestamp } from 'mongodb';
import MongoDBURI from 'mongodb-uri';

const DEFAULT_MONGO_URI = MongoDBURI.format({
  scheme: 'mongodb',
  hosts: [ { host: 'localhost', port: 27017 } ],
  database: 'local',
  options: {
    readPreference: 'secondaryPreferred'
  }
});

export default class OpLogger extends EventEmitter {
  constructor(mongodbUri) {
    super();
    this.mongodbUri = mongodbUri;
    this.handleOp = this.handleOp.bind(this);
    this.handleError = this.handleError.bind(this);
    this.tail = this.tail.bind(this);
  }

  static opMap = {
    n: 'no-op',       // does not result in a change to data
    i: 'insert',      // insert new doc
    u: 'update',      // update existing doc
    d: 'delete',      // delete existing doc
    c: 'command',     // used for communicating commands performed on dbs
    db: 'database',   // used for announcing new databases
  }

  getUri() {
    if (this.mongodbUri) {
      const parsed = MongoDBURI.parse(this.mongodbUri);
      parsed.database = 'local';
      return MongoDBURI.format(parsed);
    }
    return DEFAULT_MONGO_URI;
  }

  getDb() {
    const connectUri = this.getUri();
    return MongoClient.connect(connectUri).then((db) => {
      this.db = db;
      return Promise.resolve(db);
    }).catch(this.handleError);
  }

  async tail(timestamp) {
    const tsNow = Timestamp(0, new Date() / 1000);
    const ts = timestamp || tsNow;
    const db = this.db || await this.getDb()
    const collection = db.collection('oplog.rs');
    const cursor = collection.find({ ts: { '$gte': ts } }, {
      tailable: true,
      awaitdata: true,
    });

    const stream = cursor.stream();
    this.stream = stream;
    stream.on('data', this.handleOp);
    stream.on('error', this.handleError);
  }

  handleError(error) {
    this.emit('error', error);
  }

  handleOp(op) {
    this.emit('op', op);

    const opType = OpLogger.opMap[op.op];
    if (opType) {
      this.emit(opType, op);
    }
  }
}
