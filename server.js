//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
var request = require('request');
var cheerio = require('cheerio');
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.use(express.static(__dirname + '/public'));

app.get('/news', function (req, res) {
   res.render('news.html', { pageCountMessage : null });
   
});


app.get('/stock', function (req, res) {
   res.render('stock.html', { pageCountMessage : null });
   
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});
var stockList = [];

var listofstock = [];

app.get('/newscontent', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
	  
	/*  
	var stocknews =   db.collection('stock').aggregate({
$lookup:
    {
        from: "news",
        localField: "stockNo",
        foreignField : "stockNo",
        as: "stock_news"
    }
})
console.log(stocknews)*/
db.collection('news').find().limit(100).sort( { datetime: -1 } ).toArray(
	function(err, docs){		
		for (i = 0 ; i < docs.length;i++){
			var newsdoc = docs[i];
			var stockNo = newsdoc.stockNo;
				stockNo = stockNo.substring(1,5);
				newsdoc.stockNo = (newsdoc.stockNo).substring(1,5)+ '.HK';
			console.log('News for: ' + stockNo);
			console.log('----------------------------------------------------');
			
			stockList.push(Object.assign({ newsdoc }));
			db.collection('stock').find(
				{$or: [ {'stockName': {'$regex': stockNo, '$options': 'i'}}
					, { 'stockNo': {'$regex': stockNo, '$options': 'i'} }
				]}  
			).sort( { datetime: -1 } ).toArray(
			function(err, stockdocs){		
				stockList.push(Object.assign({ stockdocs }));
			});				
			
		}
	});
	res.send(JSON.stringify(stockList));
 // res.send('{ done: 1 }');
  } else {
    res.send('{ failed: -1 }');
  }
});


app.get('/newsall', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
	  
db.collection('news').find().sort( { datetime: -1 } ).toArray(
	function(err, docs){		
		res.send(JSON.stringify(docs));
	});
  } else {
    res.send('{ failed: -1 }');
  }
});


app.get('/data', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {

	
		
	if (req.query.action == 'search') {		
		if (req.query.data == 'news'){
			db.collection(req.query.data).find(
				{$or: [ {'docName': {'$regex': req.query.param, '$options': 'i'}}
					, { 'stockNo': {'$regex': req.query.param, '$options': 'i'} }
					, { 'stockName': {'$regex': req.query.param, '$options': 'i'} }
				]}  
			).limit(100).sort( { datetime: -1 } ).toArray(
			function(err, docs){
				res.send(JSON.stringify(docs));
			});				
		}else if (req.query.data == 'stock'){
			db.collection(req.query.data).find(
				{$or: [ {'stockName': {'$regex': req.query.param, '$options': 'i'}}
					, { 'stockNo': {'$regex': req.query.param, '$options': 'i'} }
				]}  
			).limit(100).sort( { datetime: -1 } ).toArray(
			function(err, docs){
				res.send(JSON.stringify(docs));
			});				
		}else{
			db.collection(req.query.data).find(
				{$or: [ { 'stockNo': {'$regex': req.query.param, '$options': 'i'} }
				]}  
			).limit(100).sort( { datetime: -1 } ).toArray(
			function(err, docs){
				res.send(JSON.stringify(docs));
			});		
		}
		
     
	}else{		
		db.collection(req.query.data).find().limit(100).sort( { datetime: -1 } ).toArray(
		function(err, docs){
			res.send(JSON.stringify(docs));
		});
	}
	
  } else {
    res.send('{ failed: -1 }');
  }
});

app.get('/datacount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {

	db.collection(req.query.data).count(function(err, count ){
      res.send('{ count: ' + count + '}');
    });
		
  } else {
    res.send('{ failed: -1 }');
  }
});
app.get('/datadelete', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  var invalidDelete = ['news'];
  if (db && invalidDelete.indexOf(req.query.data) == -1) {
	db.collection(req.query.data).remove( { } );
	res.send('{ removed: 1 }');	
  } else {
    res.send('{ failed: -1 }');
  }
});


var url ='http://www.hkexnews.hk/listedco/listconews/mainindex/SEHK_LISTEDCO_DATETIME_TODAY_C.HTM';
var result = []; 
var uploadToDB = function(data){
			
	var datetime = data.children().first().text().trim();
	var stockNo = data.children().first().next().text().trim();
	var stockName = data.children().first().next().next().text().trim();
	var docName = data.children().last().text().trim();
	var docUrl = data.children().last().children('a').attr('href');
	result.push(Object.assign({ datetime, stockNo, stockName, docName, docUrl }));
	var news = db.collection('news');
	news.insert({
	   _id: datetime+stockNo,
		datetime: datetime,
		stockNo: stockNo,
		stockName: stockName,
		docName: docName,
		docUrl: docUrl	
	})	
}
app.get('/scrape', function(req, res){
	request(url, function(error, response, html){
		if(!error){
			var $ = cheerio.load(html);
			
			$('.row1').filter(function(){
				var data = $(this);				
				uploadToDB(data);
	
			})
			$('.row0').filter(function(){
				var data = $(this);	
				uploadToDB(data);
	
			})
		}
		console.log(result);
		res.send("Done")
	})
})
Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('');
};

function scrapeAStock(stockNo) {
	

	var date = new Date();
	date.setDate(date.getDate() - 14);
    	var stockurl = 'https://finance.yahoo.com/quote/' + stockNo + '.HK?p=' + stockNo + '.HK&.tsrc=fin-srch';
	console.log(stockurl);
	request(stockurl, function(error, response, html){
		if(!error){
			var $ = cheerio.load(html);
			var STOCK_NAME_NUMBER = $('h1[data-reactid="7"]').text();
			var STOCK_NO = STOCK_NAME_NUMBER.substring(STOCK_NAME_NUMBER.indexOf('('), STOCK_NAME_NUMBER.length - 1).replace('(','');
			var PREV_CLOSE  = $('[data-test="PREV_CLOSE-value"]').text();
			var AVERAGE_VOLUME_3MONTH  = $('[data-test="AVERAGE_VOLUME_3MONTH-value"]').text();
			var OPEN  = $('[data-test="OPEN-value"]').text();
			var CLOSE = $('span[data-reactid="35"]').text();
			var DAYS_RANGE = $('[data-test="DAYS_RANGE-value"]').text();
			var FIFTY_TWO_WK_RANGE = $('[data-test="FIFTY_TWO_WK_RANGE-value"]').text();
			var TD_VOLUME = $('[data-test="TD_VOLUME-value"]').text();
			var TD_CHANGE = $('span[data-reactid="36"]:contains("%")').text();
			var datetime = +new Date();
			var stock = db.collection('stock');
			var datestring = new Date().yyyymmdd();
			stock.insert({
				_id: datestring+STOCK_NO,
				stockNo: STOCK_NO,
				stockName:STOCK_NAME_NUMBER,
				datetime: datetime,
				OPEN: OPEN,
				CLOSE: CLOSE,
				DAYS_RANGE: DAYS_RANGE,
				PREV_CLOSE: PREV_CLOSE,
				TD_VOLUME: TD_VOLUME,							
				TD_CHANGE: TD_CHANGE,
				FIFTY_TWO_WK_RANGE: FIFTY_TWO_WK_RANGE,
				AVERAGE_VOLUME_3MONTH: AVERAGE_VOLUME_3MONTH
			})
			
			var stockNumber = STOCK_NO.substring(0,4);
			 var myquery = { stockNo: stockNumber,  datetime:datestring};
			  var newvalues = { $set: {uodated: 1 } };
			  db.collection("stockUpdateList").updateOne(myquery, newvalues, function(err, res) {
			    if (err) throw err;
			    console.log("1 document updated");
			    
			  });
		}
	
	})
}

app.get('/scrapestocktest', function(req, res){
	var datestring = new Date().yyyymmdd();
	var uniqueStockNo = db.collection('news').distinct("stockNo",(function(err, docs){
         	console.log("=============Result===============");
		console.log(docs);
		for (var i = 0; i < docs.length; i++ ){
			var stockNos = docs[i].match(/.{1,5}/g)
			for (var j = 0 ; j < stockNos.length; j++){
				var stock = db.collection('stockUpdateList');
				stock.insert({
					_id: datestring+stockNos[j].substring(1,5),
					stockNo: stockNos[j].substring(1,5),
					uodated:0,
					datetime: datestring							
				})
				
			}
		}
   		console.log("=============Result end===============");
	
        }))

	res.send('{ done: 1 }');
})


app.get('/scrapestocktest2', function(req, res){

	var udpate = db.collection('stockUpdateList').find({ uodated: { $eq: 0 } }).limit(10).toArray(
	function(err, docs){	
		for (i = 0 ; i < docs.length;i++){
			scrapeAStock(docs[i].stockNo);
		}
		res.send(JSON.stringify(docs));
		
	})
	
})

app.get('/scrapestocktest3', function(req, res){

	var datestring = new Date().yyyymmdd();
			 var myquery = { stockNo: req.query.stockNo,  datetime:datestring};
			  var newvalues = { $set: {uodated: 1 } };
			  db.collection("stockUpdateList").updateOne(myquery, newvalues, function(err, res) {
			    if (err) throw err;
			    console.log("1 document updated");
			    
			  });
	res.send("Done ");
})

app.get('/scrapestock', function(req, res){
	var datestring = new Date().yyyymmdd();
	var date = new Date();
	date.setDate(date.getDate() - 14);
	
	db.collection('news').find().limit(100).sort( { datetime: -1 } ).toArray(
	function(err, docs){		
		for (i = 0 ; i < docs.length;i++){
			var stockNo = docs[i].stockNo;
			console.log(stockNo);
			//if (stockNo.length==5){
				stockNo = stockNo.substring(1,5);
				var stockurl = 'https://finance.yahoo.com/quote/' + stockNo + '.HK?p=' + stockNo + '.HK&.tsrc=fin-srch';
				console.log(stockurl);
				request(stockurl, function(error, response, html){
					if(!error){
						var $ = cheerio.load(html);
						var STOCK_NAME_NUMBER = $('h1[data-reactid="7"]').text();
						var STOCK_NO = STOCK_NAME_NUMBER.substring(STOCK_NAME_NUMBER.indexOf('('), STOCK_NAME_NUMBER.length - 1).replace('(','');
						var PREV_CLOSE  = $('[data-test="PREV_CLOSE-value"]').text();
						var AVERAGE_VOLUME_3MONTH  = $('[data-test="AVERAGE_VOLUME_3MONTH-value"]').text();
						var OPEN  = $('[data-test="OPEN-value"]').text();
						var CLOSE = $('span[data-reactid="35"]').text();
						var DAYS_RANGE = $('[data-test="DAYS_RANGE-value"]').text();
						var FIFTY_TWO_WK_RANGE = $('[data-test="FIFTY_TWO_WK_RANGE-value"]').text();
						var TD_VOLUME = $('[data-test="TD_VOLUME-value"]').text();
						var TD_CHANGE = $('span[data-reactid="36"]:contains("%")').text();
						var datetime = +new Date();
						var stock = db.collection('stock');
						stock.insert({
							_id: datestring+STOCK_NO,
							stockNo: STOCK_NO,
							stockName:STOCK_NAME_NUMBER,
							datetime: datetime,
							OPEN: OPEN,
							CLOSE: CLOSE,
							DAYS_RANGE: DAYS_RANGE,
							PREV_CLOSE: PREV_CLOSE,
							TD_VOLUME: TD_VOLUME,							
							TD_CHANGE: TD_CHANGE,
							FIFTY_TWO_WK_RANGE: FIFTY_TWO_WK_RANGE,
							AVERAGE_VOLUME_3MONTH: AVERAGE_VOLUME_3MONTH
						})
					}
				
				})
			//}
			
		}
		res.send("Done " + docs.length);
	});
	
	
})

app.get('/scrapeonestock', function(req, res){
	var datestring = new Date().yyyymmdd();
	var stockNo = req.query.stockNo;
	var stockurl = 'https://finance.yahoo.com/quote/' + stockNo + '.HK?p=' + stockNo + '.HK&.tsrc=fin-srch';
	request(stockurl, function(error, response, html){
		if(!error){
			var $ = cheerio.load(html);
					
			var PREV_CLOSE  = $('[data-test="PREV_CLOSE-value"]').text();
			var AVERAGE_VOLUME_3MONTH  = $('[data-test="AVERAGE_VOLUME_3MONTH-value"]').text();
			var OPEN  = $('[data-test="OPEN-value"]').text();
			var CLOSE = $('span[data-reactid="35"]').text();
			var DAYS_RANGE = $('[data-test="DAYS_RANGE-value"]').text();
			var FIFTY_TWO_WK_RANGE = $('[data-test="FIFTY_TWO_WK_RANGE-value"]').text();
			var TD_VOLUME = $('[data-test="TD_VOLUME-value"]').text();
			var TD_CHANGE = $('span[data-reactid="36"]:contains("%")').text();
			var datetime = +new Date();
			var stock = db.collection('stock');
			console.log(PREV_CLOSE);
			console.log(AVERAGE_VOLUME_3MONTH);
			console.log(OPEN);
			console.log(CLOSE);
			console.log(DAYS_RANGE);
			console.log(FIFTY_TWO_WK_RANGE);
			console.log(TD_VOLUME);
			console.log(TD_CHANGE);
			
			stock.insert({
				_id: datestring + stockNo,
				stockNo: stockNo,
				datetime: datetime,
				OPEN: OPEN,
				CLOSE: CLOSE,
				DAYS_RANGE: DAYS_RANGE,
				PREV_CLOSE: PREV_CLOSE,
				TD_VOLUME: TD_VOLUME,							
				TD_CHANGE: TD_CHANGE,
				FIFTY_TWO_WK_RANGE: FIFTY_TWO_WK_RANGE,
				AVERAGE_VOLUME_3MONTH: AVERAGE_VOLUME_3MONTH
			})
		}
		
		res.send("Done")
	})
	
	
})
app.get('/datatest', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {

	newss = []
	 result = []
	set =   db.collection('news').distinct( "stockNo" )
	 console.log('========================test====')
	db.collection('news').find().toArray(
	function(err, docs){	
		for (i = 0 ; i < docs.length;i++){
			newss.push(docs[i].stockNo);
		}
		result.push(Object.assign({ newss }));
		res.send(JSON.stringify(result));
		
	})
	console.log('========================end====')
   	
  } else {
    res.send('{ failed: -1 }');
  }
});
// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
