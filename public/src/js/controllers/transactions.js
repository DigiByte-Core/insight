'use strict';

angular.module('insight.transactions').controller('transactionsController',
function($scope, $rootScope, $routeParams, $location, Global, Transaction, TransactionsByBlock, TransactionsByAddress, getAssetMetadata, assetTransactionsByAddress, getBlockWithAssetTransactions, TransactionsAsset) {
  $scope.global = Global;
  $scope.loading = false;
  $scope.loadedBy = null;

  var pageNum = 0;
  var pagesTotal = 1;
  var COIN = 100000000;

  function simpleAssetMeta(asset) {
    var meta = asset.metaData && asset.metaData.metadataOfIssuence && asset.metaData.metadataOfIssuence.data;
    var urls = asset.metaData && asset.metaData.metadataOfIssuence && asset.metaData.metadataOfIssuence.data && asset.metaData.metadataOfIssuence.data.urls || [];
    
    var assetName = "";
    var assetDesc = "";
    var issuer = "";
    
    var smallIcon = "";
    var largeIcon = "";
    
    if (meta) {
      assetName = meta.assetName;
      assetDesc = meta.description;
      issuer = meta.issuer || "N/A";
    }
  
    urls.forEach(function (metaurl) {
      if (metaurl.name == "icon") {
        smallIcon = metaurl.url;
      }
      
      if (metaurl.name == "icon_large") {
        largeIcon = metaurl.url;
      }
    });
    
    var assetImage = largeIcon || smallIcon || "http://localhost:3001/insight/img/Digibyte-Logo.png";
    var verifications = meta && meta.verifications || false;
    var assetMeta = {name: assetName, desc: assetDesc, icon: assetImage, issuer: issuer, verifications: verifications};
    
    return assetMeta;
  }
  

  var getAssetMetaData = function(asset, utxo, callback){
    var time = Math.floor(new Date().getTime() / 1000);
    var assetName = asset.assetId;
    var assetIcon; //= defaultIcon;
    var localIndex = encodeURIComponent(utxo);
    var local = localStorage[localIndex];
    var called = false;
    var issuer = "N/A";
    var verifications = {};

    return getAssetMetadata.get({ assetId: asset.assetId, index: localIndex }, function (resp) {
      var apimeta = resp.data;
      asset.metaData = apimeta;
        
      var assetMeta = simpleAssetMeta(asset);
      assetName = assetMeta.name || asset.assetId;
      assetIcon = assetMeta.icon;
      issuer = assetMeta.issuer;
      verifications = assetMeta.verifications;
      
      // save data to localstorage
      // console.log({name: assetName, icon: assetMeta.icon, issuer: issuer, last: time, verifications: verifications});
      localStorage[localIndex] = JSON.stringify({name: assetName, icon: assetMeta.icon, issuer: issuer, last: time, verifications: verifications});
      return callback(null, {assetName: assetName, assetIcon: assetIcon, issuer: issuer, verifications: verifications});
    })
  }

  var _aggregateItems = function(items, txid) {
    if (!items) return [];

    var l = items.length;

    var ret = [];
    var tmp = {};
    var u = 0;
    var op_return = null;

    for(var i=0; i < l; i++) {

      var notAddr = false;
      // non standard input
      if (items[i].scriptSig && !items[i].addr) {
        items[i].addr = 'Unparsed address [' + u++ + ']';
        items[i].notAddr = true;
        notAddr = true;
      }

      // non standard output
      if (items[i].scriptPubKey && !items[i].scriptPubKey.addresses) {
        if(items[i].scriptPubKey.asm.indexOf('OP_RETURN') !== -1){
          op_return = true;
        }
        items[i].scriptPubKey.addresses = ['Unparsed address [' + u++ + ']'];
        items[i].notAddr = true;
        notAddr = true;
      }

      // multiple addr at output
      if (items[i].scriptPubKey && items[i].scriptPubKey.addresses.length > 1) {
        items[i].addr = items[i].scriptPubKey.addresses.join(',');
        ret.push(items[i]);
        continue;
      }

      var addr = items[i].addr || (items[i].scriptPubKey && items[i].scriptPubKey.addresses[0]);

      if (!tmp[addr]) {
        tmp[addr] = {};
        tmp[addr].valueSat = 0;
        tmp[addr].count = 0;
        tmp[addr].addr = addr;
        tmp[addr].items = [];
      }
      tmp[addr].isSpent = items[i].spentTxId;

      tmp[addr].hasAssets = false;

      if(items[i].assets && items[i].assets.length) {
        tmp[addr].hasAssets = true;
        tmp[addr].amount = 0;
        tmp[addr].assetName = items[i].assetMeta.assetName;
        tmp[addr].index = items[i].n;
        tmp[addr].txid = txid;
        tmp[addr].assetId = items[i].assets[0].assetId;
        tmp[addr].isLocked = items[i].assets[0].lockStatus;
        items[i].assets.forEach(function(asset) {
          var divisor = Math.pow(10, asset.divisibility);
          tmp[addr].amount = parseFloat(tmp[addr].amount);
          tmp[addr].amount+= asset.amount / divisor;
          tmp[addr].amount = tmp[addr].amount.toFixed(asset.divisibility); 
        })
      }

      tmp[addr].doubleSpentTxID = tmp[addr].doubleSpentTxID   || items[i].doubleSpentTxID;
      tmp[addr].doubleSpentIndex = tmp[addr].doubleSpentIndex || items[i].doubleSpentIndex;
      tmp[addr].unconfirmedInput += items[i].unconfirmedInput;
      tmp[addr].dbError = tmp[addr].dbError || items[i].dbError;
      tmp[addr].valueSat += Math.round(items[i].value * COIN);
      tmp[addr].items.push(items[i]);
      tmp[addr].notAddr = notAddr;
      tmp[addr].op_return = op_return;
      tmp[addr].count++;
    }

    angular.forEach(tmp, function(v) {
      v.value    = v.value || parseInt(v.valueSat) / COIN;
      ret.push(v);
    });
    return ret;
  };

  var _processTX = function(tx) {
    tx.vinSimple = _aggregateItems(tx.vin);
    tx.voutSimple = _aggregateItems(tx.vout);
  };

  var _paginate = function(data, assetData) {
    $scope.loading = false;

    pagesTotal = data.pagesTotal;
    pageNum += 1;

    async.each(data.txs, function(tx, callback) {
      if (assetData.transactions == null) { _processTX(tx); $scope.txs.push(tx); return callback(null); }
      var assetTx = assetData.transactions.filter(function(asset) {
        return asset.txid === tx.txid;
      })
      _addAssets(assetTx[0], tx, function(err, txWithAssets) {
        if(err) {
          return callback(err);
        }
        _processTX(txWithAssets);
        $scope.txs.push(txWithAssets);
        callback(null);
      });
    }, function() {
    })
  };

  var _byBlock = function() {
    getBlockWithAssetTransactions.get({
      hash: $routeParams.blockHash
    }, function(assetBlock) {
      TransactionsByBlock.get({
        block: $routeParams.blockHash
      }, function(data) {
        _paginate(data, assetBlock);
      });
    });
  };

  var _byAddress = function () {
    assetTransactionsByAddress.get({
      addr: $routeParams.addrStr
    }, function(assetData) {
      TransactionsByAddress.get({
        address: $routeParams.addrStr
      }, function(data) {

        _paginate(data, assetData);
      });
    });
  };

  var _addVinAssets = function(asset, tx, txid, cb) {
    var i = 0;
    var getAssetData = function(callback) {
      asset.assets.forEach(function(a) {
        getAssetMetaData(a, txid + ':' + vin.n, function (meta) {
          i++;
          asset[i].meta = meta;
          if(i === resp.data.length) {
            return callback();
          } else {
            return getAssetData(callback);
          }
        });        
      });
    }
    getAssetData(function(done) {
      //tx.assets = 
    })    
  }

  var _addAssets = function(assetTx, tx, cb) {
    tx.vin.map(function(vin, idx) {

      vin.assets = assetTx.vin[idx].assets;
      return vin;
    });
    var sortVin = function(done) {
      async.eachSeries(tx.vin, function(vin, callback) {
        async.eachSeries(vin.assets, function(asset, callbackTwo) {
          if(asset) {
            getAssetMetaData(asset, tx.txid + ':' + vin.n, function(err, meta) {
              if(err) {
                return callbackTwo(err);
              }
              vin.assetMeta = meta;
              callbackTwo();
            });
          } else {
            callbackTwo();
          }
        }, function(err) {
          callback(err);
        })
      }, function(err) {
        done(err, tx);
      });
    }

    var sortVout = function (done) {
      tx.vout.map(function(vout, idx) {
        vout.assets = assetTx.vout[idx].assets;
        return vout;
      });
      async.eachSeries(tx.vout, function(vout, callback) {
        async.eachSeries(vout.assets, function(asset, callbackTwo) {
          if(asset) {
            getAssetMetaData(asset, tx.txid + ':' + vout.n, function(err, meta) {
              if(err) {
                return callbackTwo(err);
              }
              vout.assetMeta = meta;
              callbackTwo();
            });
          } else {
            callbackTwo();
          }
        }, function(err) {
          callback(err);
        })
      }, function(err) {
        done(err, tx);
      });
    }

    async.waterfall([
      function(done) {
        sortVin(function(err, tx) {
          done(err, tx);
        })
      },
      function(txVin, done) {
        sortVout(function(err, tx) {
          done(err, tx);
        })
      }
    ], function(err) {
      return cb(err, tx);
    })
  }

  var _findTx = function(txid) {
    TransactionsAsset.get({ txId: txid }, function(assetTx) {
      return Transaction.get({ txId: txid }, function(tx) {
        _addAssets(assetTx, tx, function(err, txWithAssets) {
          $rootScope.titleDetail = txWithAssets.txid.substring(0,7) + '...';
          $rootScope.flashMessage = null;
          $scope.tx = txWithAssets;
          _processTX(txWithAssets);
          $scope.txs.unshift(txWithAssets);          
        });
      });
    }, function(e) {
      if (e.status === 400) {
        $rootScope.flashMessage = 'Invalid Transaction ID: ' + $routeParams.txId;
      }
      else if (e.status === 503) {
        $rootScope.flashMessage = 'Backend Error. ' + e.data;
      }
      else {
        $rootScope.flashMessage = 'Transaction Not Found';
      }

      $location.path('/');
    });
  };

  $scope.findThis = function() {
    _findTx($routeParams.txId);
  };

  //Initial load
  $scope.load = function(from) {
    $scope.loadedBy = from;
    $scope.loadMore();
  };

  //Load more transactions for pagination
  $scope.loadMore = function() {
    if (pageNum < pagesTotal && !$scope.loading) {
      $scope.loading = true;

      if ($scope.loadedBy === 'address') {
        _byAddress();
      }
      else {
        _byBlock();
      }
    }
  };

  // Highlighted txout
  if ($routeParams.v_type == '>' || $routeParams.v_type == '<') {
    $scope.from_vin = $routeParams.v_type == '<' ? true : false;
    $scope.from_vout = $routeParams.v_type == '>' ? true : false;
    $scope.v_index = parseInt($routeParams.v_index);
    $scope.itemsExpanded = true;
  }
  
  //Init without txs
  $scope.txs = [];

  $scope.$on('tx', function(event, txid) {
    _findTx(txid);
  });

});

angular.module('insight.transactions').controller('SendRawTransactionController',
  function($scope, $http) {
  $scope.transaction = '';
  $scope.status = 'ready';  // ready|loading|sent|error
  $scope.txid = '';
  $scope.error = null;

  $scope.formValid = function() {
    return !!$scope.transaction;
  };
  $scope.send = function() {
    var postData = {
      rawtx: $scope.transaction
    };
    $scope.status = 'loading';
    $http.post('/api/tx/send', postData)
      .success(function(data, status, headers, config) {
        if(typeof(data.txid) != 'string') {
          // API returned 200 but the format is not known
          $scope.status = 'error';
          $scope.error = 'The transaction was sent but no transaction id was got back';
          return;
        }

        $scope.status = 'sent';
        $scope.txid = data.txid;
      })
      .error(function(data, status, headers, config) {
        $scope.status = 'error';
        if(data) {
          $scope.error = data;
        } else {
          $scope.error = "No error message given (connection error?)"
        }
      });
  };
});
