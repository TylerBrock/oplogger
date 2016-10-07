## OpLogger -- The MongoDB OpLog Tailer

### Installation

```sh
npm install --save oplogger
```

### Example usage

```js
var oplog = new OpLogger();
oplog.tail();
oplog.on('op', (op) => { console.log('op:', op) });
oplog.on('insert', (op) => { console.log('insert:', op) });
oplog.on('update', (op) => { console.log('update:', op) });
oplog.on('delete', (op) => { console.log('delete:', op) });
```
