var express = require('express');
var http = require("http");
var io = require('socket.io');
var Twit = require('twit');
var OAuth= require('oauth').OAuth;

var app = express();

var twitObj = new Twit({
            consumer_key:         'Mq5nZDXjwtM5JTuvGRckOw'
          , consumer_secret:      'BJKqFZaKFnI1ynLYixOXDBhGrEqLmb4IpPHSfUVFEA'
          , access_token:         '1351190376-o4q56bHU3391Bv3MDSGGu1bB6ni86IJnbvmEIP5'
          , access_token_secret:  'cUpPQFU3VsjDUC7ylpaGkKwvvUiY3a4vJ8t6IaBig'
        });

var oa = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    "Mq5nZDXjwtM5JTuvGRckOw",
	"BJKqFZaKFnI1ynLYixOXDBhGrEqLmb4IpPHSfUVFEA",
	"1.0",
	"http://admiostest.hugo506.c9.io/twitter_callback",
	"HMAC-SHA1"
);


app.configure(function(){
  app.set('ip', process.env.IP);
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('stylesheets', __dirname + '/public/stylesheets');
  app.set('view engine', 'jade');
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser());
  app.use(express.session( { secret: 'whatever' } ));
  app.use(express.bodyParser());
});


app.get('/', function(req, res){
  res.render('index', {
    title: 'Login'
  });
});

app.get('/stock_check', function(req, res){
  res.render('stock_check', {
    title: 'Check Stock Symbol'
  });
});

app.post('/get_stock_data', function(req, res){

  var symbol = req.body.symbol;
  var parseString = require('xml2js').parseString;
  var options = {
      host: 'www.google.com',
      path: '/ig/api?stock='+symbol};

  var request = http.get(options, function(response) {

    var xmlData = "";
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      //console.log(chunk);
      xmlData += chunk;
    });


    response.on('end', function(){
      parseString(xmlData, function (err, result) {
          var symbolName = result.xml_api_reply.finance[0].exchange[0]['$']['data'];

          if('UNKNOWN EXCHANGE' == symbolName){
              res.send({value:'Error invalid stock symbol'});
          }else{
              res.send({value:'Symbol is valid', stock:result.xml_api_reply.finance[0]});
          }
      });
    });
  });
});



app.get('/twitter_auth', function(req, res){
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if (error) {
			console.log(error);
			res.send("yeah no. didn't work.")
		}
		else {
			req.session.oauth = {};
			req.session.oauth.token = oauth_token;
			//console.log('oauth.token: ' + req.session.oauth.token);
			req.session.oauth.token_secret = oauth_token_secret;
			//console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
			res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
	}
	});
});


app.get('/twitter_callback', function(req, res, next){
    if (req.session.oauth) {
		req.session.oauth.verifier = req.query.oauth_verifier;
		var oauth = req.session.oauth;

		oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier,
		function(error, oauth_access_token, oauth_access_token_secret, results){
			if (error){
				console.log(error);
				//res.send("yeah something broke.");
                res.redirect("/");
			} else {
				req.session.oauth.access_token = oauth_access_token;
				req.session.oauth.access_token_secret = oauth_access_token_secret;
				console.log(results);
				//res.send("worked. nice one.");
                res.render('stock_check', {
                    title: 'Stock Check'
                  });
			}
		}
		);
	} else
		next(new Error("you're not supposed to be here."))
});


// create a server
var server = http.createServer(app).listen(app.get('port'));


//create the socket object, use the main server
var socketIo = require('socket.io').listen(server);


socketIo.on('connection', function(socket) {

    var stream;
    
    socket.on('setSymbol', function (data) {
      
      

      //create a twitter stream with tweets about the specified stock symbol
      stream = twitObj.stream('statuses/filter', { track: data.symbol });
      
      //listen for tweets and forward to the client socket
      stream.on('tweet', function (tweet) {
        //console.log(tweet.user.name+" says: "+tweet.text);
        socket.emit('symbolTweet',{name: tweet.user.name, tweetText: tweet.text});
      });
      
    });
        
    socket.on('disconnect', function () {
        stream.stop();
    });


});



