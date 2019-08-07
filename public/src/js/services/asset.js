'use strict';

var EXPLORER_API_URL = 'https://explorerapi.digiassets.net/api';
var ASSET_API_URL = 'https://api.digiassets.net';

angular.module('insight.assets')
  .factory('assetInfo',
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getassetinfo?assetId=:assetId&utxo=:txid', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('TransactionsAsset',
    function($resource) {
    return $resource(EXPLORER_API_URL + '/gettransaction?txid=:txId', {
      txId: '@txId'
    }, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })  
  .factory('assetInfoWithTxes',
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getassetinfowithtransactions?assetId=:assetId', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('assetMetadata',
  function($resource) {
    return $resource(ASSET_API_URL + '/v2/assetmetadata/:assetId/:txid', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('getAddressInfo', 
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getaddressinfo?address=:addr', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });    
  })
  .factory('assetTransactionsByAddress', 
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getaddressinfowithtransactions?address=:addr', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });    
  })
  .factory('getBlockWithAssetTransactions', 
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getblockwithtransactions?height_or_hash=:hash', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });    
  })
  .factory('getAssetMetadataUtxo',
  function($resource) {
    return $resource(ASSET_API_URL + '/v2/assetmetadata/:assetId/:index', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });    
  })
  .factory('getAssetMetadata',
    function($resource) {
      return $resource(ASSET_API_URL + '/v2/assetmetadata/:assetId', {}, {
        get: {
          method: 'GET',
          interceptor: {
            response: function (res) {
              return res.data;
            },
            responseError: function (res) {
              if (res.status === 404) {
                return res;
              }
            }
          }
        }
      }); 
  })
  .factory('getPopularAssets',
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getpopularassets');   
  })
  .factory('getMainStats',
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getmainstats', {}, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });    
  })
  .factory('getAssetTransactions',
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getdatransactions?limit=5');    
  }).factory('getAllAssetTransactions',
  function($resource) {
    return $resource(EXPLORER_API_URL + '/getdatransactions');    
  });