
var express = require('express');
var http = require("http");
var io = require('socket.io');
var app = express();


var OAuth= require('oauth').OAuth;

var oa = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    "Mq5nZDXjwtM5JTuvGRckOw",
	"BJKqFZaKFnI1ynLYixOXDBhGrEqLmb4IpPHSfUVFEA",
	"1.0",
	"http://admios.hugo506.c9.io/twitter_callback",
	"HMAC-SHA1"	
);


app.configure(function(){
  app.set('ip', process.env.IP);
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('stylesheets', __dirname + '/stylesheets');
  app.set('view engine', 'jade');
});

app.use(express.cookieParser());
app.use(express.session( { secret: 'whatever' } ));
app.use(express.bodyParser());

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
              res.send('Error invalid stock symbol');              
          }else{
              res.send('Symbol is valid');
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
				res.send("yeah something broke.");
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


//create the socket object
var socket = io.listen(server);

socket.on('connection', function(socket) {

    socket.emit('symbolTweet',{data:'test'});

/*
  var Twit = require('twit');
  var T = new Twit({
                    consumer_key:         'Mq5nZDXjwtM5JTuvGRckOw'
                  , consumer_secret:      'BJKqFZaKFnI1ynLYixOXDBhGrEqLmb4IpPHSfUVFEA'
                  , access_token:         '1351190376-bGasUCIjA2tYikn9LWUzGGXrPt8Pulm5uko72Ef'
                  , access_token_secret:  'EHTMLB8295DjYEL1z3b6ffOz9neeFVK1ohBM7e7n4'
                });

  var stream = T.stream('statuses/filter', { track: 'mango' });//symbolName
  
  stream.on('tweet', function (tweet) {                  
      //console.log(tweet.user.name+" says: "+tweet.text);    
      socket.emit('symbolTweet',{data: tweet.user.name+" says: "+tweet.text});
  });
  */
                
  /*T.stream('statuses/filter', { track: symbolName },
    function(stream) {
      stream.on('data',function(data){
        socket.emit('twitter',data);
      });
    });*/
});




