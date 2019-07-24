var express = require("express");
var request = require("sync-request");
var url = require("url");
var qs = require("qs");
var querystring = require('querystring');
var cons = require('consolidate');
var randomstring = require("randomstring");
var __ = require('underscore');
__.string = require('underscore.string');

var app = express();

app.engine('html', cons.underscore);
app.set('view engine', 'html');
app.set('views', 'files/client');

// authorization server information
var authServer = {
	authorizationEndpoint: 'http://localhost:9001/authorize',
	tokenEndpoint: 'http://localhost:9001/token'
};

// client information


var client = {
	"client_id": "oauth-client-1",
	"client_secret": "oauth-client-secret-1",
	"redirect_uris": ["http://localhost:9000/callback"]
};

var protectedResource = 'http://localhost:9002/resource';

var state = null;

var access_token = null;
var scope = null;

app.get('/', function (req, res) {
	res.render('index', {access_token: access_token, scope: scope});
});

app.get('/authorize', function(req, res){

	/*
	 * Send the user to the authorization server
	 */

        // サーバ経由のリクエストであることを保証するためのランダムなパラメータ
        var state = randomstring.generate()

        // 認可エンドポイントのURLへリダイレクト
        var authorizeUrl = buildUrl(authServer.authorizationEndpoint, {
          response_type: 'code',
          client_id: client.client_id,
          redirect_uri: client.redirect_uris[0],
          state: state
        });
        res.redirect(authorizeUrl);
});

app.get('/callback', function(req, res){

	/*
	 * Parse the response from the authorization server and get a token
	 */

        // Stateの値を検証し、サーバ経由のリダイレクトであることを確認する
        if (req.query.state = state) {
          res.render('error', { error: 'State value did not match' });
          return;
        }

        // 認可コードを読み取り
	var code = req.query.code;

　      // 認可コードをトークンエンドポイントへ送信
        var form_data = qs.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: client.redirect_uris[0]
        });

        // Basic認証を行うため、リクエストヘッダを組み立て
        var headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + encodeClientCredentials(client.client_id, client.client_secret)
        }

        // 認可サーバへPOSTする
        var tokRes = request('POST', authServer.tokenEndpoint, {
          body: form_data,
          headers: headers
        });

        // body を解析し、アクセストークンを受け取り
        var body = JSON.parse(tokRes.getBody());
        access_token = body.access_token;

});

app.get('/fetch_resource', function(req, res) {

	/*
	 * Use the access token to call the resource server
	 */
	
});

var buildUrl = function(base, options, hash) {
	var newUrl = url.parse(base, true);
	delete newUrl.search;
	if (!newUrl.query) {
		newUrl.query = {};
	}
	__.each(options, function(value, key, list) {
		newUrl.query[key] = value;
	});
	if (hash) {
		newUrl.hash = hash;
	}
	
	return url.format(newUrl);
};

var encodeClientCredentials = function(clientId, clientSecret) {
	return new Buffer(querystring.escape(clientId) + ':' + querystring.escape(clientSecret)).toString('base64');
};

app.use('/', express.static('files/client'));

var server = app.listen(9000, 'localhost', function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('OAuth Client is listening at http://%s:%s', host, port);
});
 
