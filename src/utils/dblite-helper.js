var dblite = require('../dblite');
var async = require('async');
var path = require('path');

var isWin = /^win/.test(process.platform);
var isMac = /^darwin/.test(process.platform);

// dblite.bin = path.join(process.cwd(), 'sqlite3', 'sqlite3');

module.exports.connect = function (connectString, cb) {
  var db = dblite(connectString);
  var sql = [
    "CREATE TABLE IF NOT EXISTS blocks (id VARCHAR(64) PRIMARY KEY, version INT NOT NULL, timestamp INT NOT NULL, height INT NOT NULL, previousBlock VARCHAR(64), numberOfTransactions INT NOT NULL, totalFee BIGINT NOT NULL, reward BIGINT NOT NULL, payloadLength INT NOT NULL, payloadHash BINARY(32) NOT NULL, generatorPublicKey BINARY(32) NOT NULL, blockSignature BINARY(64) NOT NULL, FOREIGN KEY ( previousBlock ) REFERENCES blocks ( id ) ON DELETE SET NULL)",
    "CREATE TABLE IF NOT EXISTS trs (id VARCHAR(64) PRIMARY KEY, blockId VARCHAR(64) NOT NULL, type TINYINT NOT NULL, timestamp INT NOT NULL, senderPublicKey BINARY(32) NOT NULL, senderId VARCHAR(50) NOT NULL, recipientId VARCHAR(50), amount BIGINT NOT NULL, fee BIGINT NOT NULL, signature BINARY(64) NOT NULL, signSignature BINARY(64), requesterPublicKey BINARY(32), signatures TEXT, currency VARCHAR(30), message VARCHAR(256), FOREIGN KEY(blockId) REFERENCES blocks(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS signatures (transactionId VARCHAR(64) NOT NULL PRIMARY KEY, publicKey BINARY(32) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS delegates(username VARCHAR(20) NOT NULL, transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS votes(votes TEXT, transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS forks_stat(delegatePublicKey BINARY(32) NOT NULL, blockTimestamp INT NOT NULL, blockId VARCHAR(64) NOT NULL, blockHeight INT NOT NULL, previousBlock VARCHAR(64) NOT NULL, cause INT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS multisignatures(min INT NOT NULL, lifetime INT NOT NULL, keysgroup TEXT NOT NULL, transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS dapps(transactionId VARCHAR(64) NOT NULL, name VARCHAR(32) NOT NULL, description VARCHARH(160), tags VARCHARH(160), link TEXT, type INTEGER NOT NULL, category INTEGER NOT NULL, icon TEXT, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS intransfer(dappId VARCHAR(20) NOT NULL, transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS outtransfer(transactionId VARCHAR(64) NOT NULL, dappId VARCHAR(20) NOT NULL, outtransactionId VARCHAR(64) NOT NULL UNIQUE, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS peers (id INTEGER NOT NULL PRIMARY KEY, ip INTEGER NOT NULL, port TINYINT NOT NULL, state TINYINT NOT NULL, os VARCHAR(64), version VARCHAR(11), clock INT)",
    "CREATE TABLE IF NOT EXISTS peers_dapp (peerId INT NOT NULL, dappid VARCHAR(20) NOT NULL, FOREIGN KEY(peerId) REFERENCES peers(id) ON DELETE CASCADE)",

    // UIA transactions
    "CREATE TABLE IF NOT EXISTS issuers(name VARCHAR(20) NOT NULL PRIMARY KEY, desc VARCHAR(4096) NOT NULL, issuerId VARCHAR(50), transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS assets(currency VARCHAR(30) NOT NULL PRIMARY KEY, desc VARCHAR(4096) NOT NULL, category VARCHAR(21), maximum VARCHAR(50) NOT NULL, precision TINYINT NOT NULL, estimatePrice VARCHAR(10), estimateUnit VARCHAR(10), exerciseUnit VARCHAR(50), name VARCHAR(256) NOT NULL, extra TEXT, unlockCondition TINYINT, issuerName VARCHAR(20), quantity VARCHAR(50), approved TINYINT, transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS issues(currency VARCHAR(30) NOT NULL, amount VARCHAR(50) NOT NULL, exchangeRate VARCHAR(20) NOT NULL, approved2 TINYINT, transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS approvals(senderId VARCHAR(50), topic INT, value VARCHAR(256), transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS exercises(currency2 VARCHAR(30) NOT NULL, amount VARCHAR(50) NOT NULL, transactionId VARCHAR(64) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
    
    // UIA states
    "CREATE TABLE IF NOT EXISTS mem_asset_balances(currency VARCHAR(26) NOT NULL, address VARCHAR(50) NOT NULL, balance VARCHAR(50) NOT NULL)",

    "CREATE TABLE IF NOT EXISTS map_bigint(key VARCHAR(256) NOT NULL PRIMARY KEY, value BIGINT NOT NULL)",

    // UIA indexs
    "CREATE INDEX IF NOT EXISTS issuers_trs_id ON issuers(transactionId)",
    "CREATE INDEX IF NOT EXISTS issuers_issuer_id ON issuers(issuerId)",
    "CREATE INDEX IF NOT EXISTS assets_trs_id ON assets(transactionId)",
    "CREATE INDEX IF NOT EXISTS assets_issuer_name ON assets(issuerName)",
    "CREATE INDEX IF NOT EXISTS assets_approved ON assets(approved)",
    "CREATE INDEX IF NOT EXISTS issues_trs_id ON issues(transactionId)",
    "CREATE INDEX IF NOT EXISTS issues_approved2 ON issues(approved2)",
    "CREATE INDEX IF NOT EXISTS approvals_trs_id ON approvals(transactionId)",
    "CREATE INDEX IF NOT EXISTS approvals_sender_id ON approvals(senderId)",
    "CREATE INDEX IF NOT EXISTS approvals_topic ON approvals(topic)",
    "CREATE INDEX IF NOT EXISTS approvals_value ON approvals(value)",
    "CREATE INDEX IF NOT EXISTS exercises_trs_id ON exercises(transactionId)",
    "CREATE INDEX IF NOT EXISTS exercises_currency2 ON exercises(currency2)",
    "CREATE INDEX IF NOT EXISTS balance_address on mem_asset_balances(address)",
    "CREATE INDEX IF NOT EXISTS balance_currency on mem_asset_balances(currency)",

    // Indexes
    "CREATE UNIQUE INDEX IF NOT EXISTS blocks_height ON blocks(height)",
    "CREATE UNIQUE INDEX IF NOT EXISTS blocks_previousBlock ON blocks(previousBlock)",
    "CREATE UNIQUE INDEX IF Not EXISTS out_transaction_id ON outtransfer(outTransactionId)",
    "CREATE UNIQUE INDEX IF NOT EXISTS peers_unique ON peers(ip, port)",
    "CREATE UNIQUE INDEX IF NOT EXISTS peers_dapp_unique ON peers_dapp(peerId, dappid)",
    "CREATE INDEX IF NOT EXISTS blocks_generator_public_key ON blocks(generatorPublicKey)",
    "CREATE INDEX IF NOT EXISTS blocks_reward ON blocks(reward)",
    "CREATE INDEX IF NOT EXISTS blocks_totalFee ON blocks(totalFee)",
    "CREATE INDEX IF NOT EXISTS blocks_numberOfTransactions ON blocks(numberOfTransactions)",
    "CREATE INDEX IF NOT EXISTS blocks_timestamp ON blocks(timestamp)",
    "CREATE INDEX IF NOT EXISTS trs_block_id ON trs(blockId)",
    "CREATE INDEX IF NOT EXISTS trs_sender_id ON trs(senderId)",
    "CREATE INDEX IF NOT EXISTS trs_recipient_id ON trs(recipientId)",
    "CREATE INDEX IF NOT EXISTS trs_senderPublicKey on trs(senderPublicKey)",
    "CREATE INDEX IF NOT EXISTS trs_type on trs(type)",
    "CREATE INDEX IF NOT EXISTS trs_timestamp on trs(timestamp)",
    "CREATE INDEX IF NOT EXISTS trs_currency on trs(currency)",
    "CREATE INDEX IF NOT EXISTS trs_message on trs(message)",
    "CREATE INDEX IF NOT EXISTS signatures_trs_id ON signatures(transactionId)",
    "CREATE INDEX IF NOT EXISTS votes_trs_id ON votes(transactionId)",
    "CREATE INDEX IF NOT EXISTS delegates_trs_id ON delegates(transactionId)",
    "CREATE INDEX IF NOT EXISTS multisignatures_trs_id ON multisignatures(transactionId)",
    "CREATE INDEX IF NOT EXISTS dapps_trs_id ON dapps(transactionId)",
    "CREATE INDEX IF NOT EXISTS dapps_name ON dapps(name)",
    "PRAGMA foreign_keys=ON",
    "PRAGMA synchronous=OFF",
    "PRAGMA journal_mode=MEMORY",
    "PRAGMA default_cache_size=10000",
    "PRAGMA locking_mode=EXCLUSIVE",

    "insert or ignore into map_bigint values(\"REWARD_POOL_BALANCE\", 0)",
    "insert or ignore into map_bigint values(\"TOTAL_ACC_QUANTITY\", 0)"
  ];

  var post = [
    "UPDATE peers SET state = 1, clock = null where state != 0"
  ];

  async.eachSeries(sql, function (command, cb) {
    db.query(command, function (err, data) {
      cb(err, data);
    });
  }, function (err) {
    if (err) {
      return cb(err);
    }

    var migration = {};

    db.query("PRAGMA user_version", function (err, rows) {
      if (err) {
        return cb(err);
      }

      var currentVersion = rows[0] || 0;

      var nextVersions = Object.keys(migration).sort().filter(function (ver) {
        return ver > currentVersion;
      });

      async.eachSeries(nextVersions, function (ver, cb) {
        async.eachSeries(migration[ver], function (command, cb) {
          db.query(command, function (err, data) {
            cb(err, data);
          });
        }, function (err) {
          if (err) {
            return cb(err);
          }

          db.query("PRAGMA user_version = " + ver, function (err, data) {
            cb(err, data);
          });
        });
      }, function (err) {
        if (err) {
          return cb(err);
        }

        async.eachSeries(post, function (command, cb) {
          db.query(command, function (err, data) {
            cb(err, data);
          });
        }, function (err) {
          cb(err, db);
        });
      });
    });
  });
}
