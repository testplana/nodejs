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


app.get('/news', function (req, res) {
   res.render('news.html', { pageCountMessage : null });
   
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

var listofstock = [];
app.get('/newscontent', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
	if (req.query.type == 1){
		db.collection('news-type1').find().limit(10).sort( { datetime: -1 } ).toArray(
		function(err, docs){
			res.send(JSON.stringify(docs));
		});
		
	}else if (req.query.type == 2) {
		var param = '/.*翌日.*/';
		//console.log(param);
		db.collection('news').find({"docName": param}).limit(10).sort( { datetime: -1 } ).toArray(
		function(err, docs){
			res.send(JSON.stringify(docs));
		});
     
	}else{
		db.collection('news').find().limit(10).sort( { datetime: -1 } ).toArray(
		function(err, docs){
			res.send(JSON.stringify(docs));
		});
		
	}

  } else {
    res.send('{ failed: -1 }');
  }
});

app.get('/newscount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {

	db.collection('news').count(function(err, count ){
      res.send('{ newCount: ' + count + '}');
    });
		
  } else {
    res.send('{ failed: -1 }');
  }
});

app.get('/newsdelete', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {

	db.collection('news').remove( { } );
	res.send('{ removed: 1 }');	
  } else {
    res.send('{ failed: -1 }');
  }
});

app.get('/test', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
const result = []; 
 request({
    url: "http://www.cwb.gov.tw/V7/modules/MOD_EC_Home.htm", // 中央氣象局網頁
    method: "GET"
  }, function (error, response, body) {
    if (error || !body) {
      return;
    }
    const $ = cheerio.load(body); // 載入 body
    // 建立一個儲存結果的容器
    const table_tr = $(".BoxTable tr"); // 爬最外層的 Table(class=BoxTable) 中的 tr

    for (let i = 1; i < table_tr.length; i++) { // 走訪 tr
      const table_td = table_tr.eq(i).find('td'); // 擷取每個欄位(td)
      const time = table_td.eq(1).text(); // time (台灣時間)
      const latitude = table_td.eq(2).text(); // latitude (緯度)
      const longitude = table_td.eq(3).text(); // longitude (經度)
      const amgnitude = table_td.eq(4).text(); // magnitude (規模)
      const depth = table_td.eq(5).text(); // depth (深度)
      const location = table_td.eq(6).text(); // location (位置)
      const url = table_td.eq(7).text(); // url (網址)
      // 建立物件並(push)存入結果
      result.push(Object.assign({ time, latitude, longitude, amgnitude, depth, location, url }));
    }
    // 在終端機(console)列出結果
    console.log(result);
   
  });
  
  res.send( result);
	
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
	var type1 = db.collection('news-type1');
	if (docName.indexOf('股份購回') > 0){
		type1.insert({
		   _id: datetime+stockNo,
			datetime: datetime,
			stockNo: stockNo,
			stockName: stockName,
			docName: docName,
			docUrl: docUrl	
		})			
	}
	
	
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
