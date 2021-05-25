/**
 * http://usejsdoc.org/
 */
const express = require('express'); 
const morgan = require('morgan'); 
const path = require('path'); 
const mysql = require('mysql'); 
const multer = require('multer'); 
const fs = require('fs');

//서버 설정 - 80번 포트로 설정 : http의 경우 포트 번호를 입력할 필요가 없음
//https를 사용하는 경우에는 443번을 사용하면 입력할 필요가 없음
//0-1024(시스템 예약), 1521, 8080, 3306, 27017번은 피하는 것이 좋음
const app = express(); 
app.set('port', process.env.PORT || 80);

//로그 출력 설정 
app.use(morgan('dev'));

//정적 파일 사용 설정 
app.use(express.static('public'));

//post 방식의 파라미터 읽기 
var bodyParser = require('body-parser') 
app.use( bodyParser.json() ); // to support JSON-encoded bodies 
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies 
	extended: true 
}));

//파일 다운로드를 위한 설정 
var util = require('util') 
var mime = require('mime')

//에러가 발생한 경우 처리 
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).send(err.message) 
});

//파일 업로드를 위한 설정 
//img 디렉토리를 연결 
try {
	fs.readdirSync('public/img'); 
} catch(error) {
	console.error('img 폴더가 없으면 img 폴더를 생성합니다.');
	fs.mkdirSync('public/img'); 
} 
//파일 이름은 기본 파일 이름에 현재 시간을 추가해서 생성 
const upload = multer({
	storage: multer.diskStorage({
		destination(req, file, done) { 
			done(null, 'public/img/');
		},
		filename(req, file, done) { 
			const ext = path.extname(file.originalname); 
			done(null, path.basename(file.originalname, ext) + Date.now() + ext);
		},
	}), 
	limits: { fileSize: 10 * 1024 * 1024 },
});

//데이터베이스 연결 설정
var connection; 
function connect() {
	connection = mysql.createConnection({ 
		host :'localhost', 
		port : 3306, 
		user : 'injun', 
		password : '1234', 
		database:'injundb' 
	}); 
	connection.connect(function(err) { 
		if(err) { 
			console.log('mysql connection error'); 
			console.log(err); 
			throw err; 
		} else { 
			console.log('mysql connection success'); 
		}
	});
}

var year; 
var month; 
var day; 
var hour; 
var minute; 
var second;

//현재 날짜 및 시간을 저장해주는 함수 
function currentDay() {
	//현재 날짜 및 시간의 년월일 시분초 가져오기 
	var date = new Date() 
	year = date.getFullYear(); 
	month = (1 + date.getMonth()); 
	month = month >= 10 ? month : '0' + month; 
	day = date.getDate(); 
	day = day >= 10 ? day : '0' + day;

	hour = date.getHours(); 
	hour = hour >= 10 ? hour : '0' + hour; 
	minute = date.getMinutes(); 
	minute = minute >= 10 ? minute : '0' + minute; 
	second = date.getSeconds(); 
	second = second >= 10 ? second : '0' + second;
}
//프로젝트의 update.txt 파일에 마지막 업데이트 날짜 및 시간을 저장해주는 함수 
function updateDate() { 
	const writeStream = fs.createWriteStream('./update.txt'); 
	writeStream.write(year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second);

	writeStream.end(); 
}

//프로젝트의 commentupdate.txt 파일에 마지막 업데이트 날짜 및 시간을 저장해주는 함수 
function commentUpdateDate() { 
	const writeStream = fs.createWriteStream('./commentupdate.txt'); 
	writeStream.write(year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second);

	writeStream.end(); 
}


//id 중복 체크 처리
app.get('/user/idcheck', (req, res) => {
	//get 방식의 파라미터 가져오기
	const userid = req.query.userid;
	connect();
	connection.query('SELECT * FROM user where userid=?', [userid], function(err, results, fields) {
		if (err) {
			throw err;
		}
		if(results[0]) {
			res.json({'result':false}); 
		}else {
			res.json({'result':true}); 
		}
		close();
	});
});

//username 중복 체크 처리
app.get('/user/usernamecheck', (req, res) => {
	//get 방식의 파라미터 가져오기
	const username = req.query.username;
	connect();
	connection.query('SELECT * FROM user where username=?', [username], function(err, results, fields) {
		if (err) {
			throw err;
		}
		if(results[0]) {
			res.json({'result':false}); 
		}else {
			res.json({'result':true}); 
		}
		close();
	});
});

//회원가입
app.post('/user/register', (req, res) => {
	//post 방식의 파라미터 가져오기
	const userid = req.body.userid;
	const userpw = req.body.userpw;
	const username = req.body.username;
	
	var userimgurl = "userimg.jpg"; 

	connect();
	connection.query('insert into user(userid, userpw, username, userimgurl) values(?, SHA2(?, 256), ?, ?)',
			[userid, userpw, username, userimgurl], function(err, results, fields) {
		if (err) {
			throw err;
		}
		if(results.affectedRows == 1) {
			res.json({'result':true}); 
		}else {
			res.json({'result':false}); 
		}
		close();
	});
});

//로그인
app.post('/user/login', (req, res) => {
	//post 방식의 파라미터 가져오기
	const userid = req.body.userid;
	const userpw = req.body.userpw;
	connect();
	
	currentDay();
	
	connection.query('SELECT * FROM user where userid=? and userpw=SHA2(?, 256)', [userid, userpw], function(err, results, fields) {
		if (err)
			throw err;
		var loginresults = results
		//데이터가 존재하면 현재 시간으로 로그인 로그 삽입 
		if(loginresults.length == 1) {
			connection.query('insert into loginlog(userid, loginlogdate) values(?, ?)', [userid, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second], function(err, results, fields) {
				if (err)
					throw err;
				 
				//로그삽입에 성공하면 true를 출력하고 데이터를 user에 출력
				if(results.affectedRows == 1) {
					res.json({'result':true, 'user':loginresults[0]});
				}
				//로그인 데이터가 존재하지 않으면 result에 false를 출력
				else {
					res.json({'result':false}); 
				}
				close();
			});
		}
		//로그인 데이터가 존재하지 않으면 result에 false를 출력
		else {
			res.json({'result':false}); 
			close();
		}
	});
});

//현재 비밀번호 체크 
app.post('/user/passwordcheck', (req, res) => {
	//post 방식의 파라미터 가져오기
	const userid = req.body.userid;
	const userpw = req.body.userpw;
	connect();
	connection.query('SELECT * FROM user where userid=? and userpw=SHA2(?, 256)', [userid, userpw], function(err, results, fields) {
		if (err)
			throw err;
		//데이터가 존재하지 않으면 result에 false를 출력 
		if(results.length == 0) {
			res.json({'result':false}); 
		}
		//데이터가 존재하면 result에 true를 출력하고 데이터를 item에 출력
		else {
			res.json({'result':true}); 
		}
		close();
	});
});

//비밀번호 변경 
app.put('/user/passwordupdate', (req, res) => {
	//put 방식의 파라미터 가져오기
	const userid = req.body.userid;
	const userpw = req.body.userpw;
	
	connect();
	connection.query('update user set userpw=SHA2(?, 256) where userid=?', [userpw, userid], function(err, results, fields) {
		if (err)
			throw err;
		//영향 받은 행이 있다면 - 성공
		if(results.affectedRows == 1) {
			res.json({'result':true});
		} else {
			res.json({'result':false}); 
		}
		close();
	});
});


//유저 정보 수정
app.put('/user/update', upload.single('userimgurl'), (req, res, next) => {
	//파라미터 가져오기 
	const userid = req.body.userid; 
	const username = req.body.username; 
	const oldimgurl = req.body.oldimgurl;

	var userimgurl; 
	if(req.file) {
		userimgurl = req.file.filename 
	}else {
		userimgurl = oldimgurl;
	}

	connect();
	
	currentDay();
	
	//유저 정보 수정 SQL 실행 
	connection.query('update user set username=?, userimgurl=? where userid=?', [username, userimgurl, userid], function(err, results, fields) {

		if(err) throw err;
		updateResults = results; 
		
		connection.query('SELECT * FROM user where userid = ? and username=?', [userid, username], function(err, results, fields) {
			if (err)
				throw err;
			//영향 받은 행이 있다면 - 성공
			if(updateResults.affectedRows == 1 && results.length == 1) { 
				updateDate();
				//성공한 경우 true
				res.json({'result':true, 'user':results[0]});
			}else {  
				//실패한 경우 false
				res.json({'result':false}); 
			} 
			close();
		});
	});
});

//데이터 전부 가져오기를 처리해주는 요청
app.get('/item/getall', (req, res, next) => {
	//데이터베이스 연결
	connect();
	//읽어온 데이터를 저장할 변수
	var list; 
	//데이터베이스에 SQL 실행 
	connection.query('SELECT * FROM item order by itemid desc', function(err, results, fields) {
		if(err) { 
			throw err;
		}
		//결과 저장
		list = results;
		//전체 데이터 개수 가져오기
		connection.query('SELECT count(*) cnt FROM item', function(err, results, fields) { 
			if(err) throw err; 
			res.json({'count':results[0].cnt, 'list':list}); 
			close();
		});
	});
});

//페이지 단위 데이터 가져오기
//app.get('/item/paging', (req, res, next) => { 
//	
//	//ex http://192.168.0.4/item/paging?pageno=2&count=3
//	
//	//get 방식의 파라미터 가져오기 
//	const pageno = req.query.pageno; 
//	const count = req.query.count;
//
//	console.log(count); 
//	//데이터를 가져올 시작 위치와 데이터 개수 설정 
//	var start = 0;
//	var size = 10;
//	if(pageno != undefined){
//		if(count != undefined){ 
//			size = parseInt(count)
//		}
//		start = (pageno - 1) * size 
//	}
//	//시작 위치와 페이지 당 데이터 개수를 설정해서 가져오기 
//	var list;
//	connect(); 
//	connection.query('SELECT * FROM item order by itemid desc limit ?, ?', [start, size], function(err, results, fields) { 
//		if(err){ 
//			throw err; 
//		} 
//		list = results; 
//		//전체 데이터 개수 가져오기 
//		connection.query('SELECT count(*) cnt FROM item', function(err, results, fields) { 
//			if(err) 
//				throw err; 
//			res.json({'count':results[0].cnt, 'list':list}); 
//			close();
//		});
//	});
//});


//username을 기반으로 페이지 단위 데이터 가져오기
app.get('/item/paging', (req, res, next) => { 
	
	//ex http://192.168.0.4/item/paging?pageno=2&count=3&username=we700&searchusername=&searchitemname=&searchdescription=
	
	//get 방식의 파라미터 가져오기 
	const pageno = req.query.pageno; 
	const count = req.query.count;
	const username = req.query.username;
	var searchkeyword = req.query.searchkeyword;

	searchkeyword = '%' + searchkeyword + '%'
	
	console.log(searchkeyword); 
	
	//데이터를 가져올 시작 위치와 데이터 개수 설정 
	var start = 0;
	var size = 10;
	if(pageno != undefined) {
		if(count != undefined) { 
			size = parseInt(count)
		}
		start = (pageno - 1) * size 
	}
	
	var list;
	var allcount
	var searchcount
	
	connect(); 
	
	connection.query('SELECT item.*, CASE WHEN itemlike.likeid IS NULL THEN false ELSE true END AS useritemlike, user.userimgurl AS userimgurl, (SELECT count(*) cnt FROM comment WHERE comment.itemid = item.itemid) AS commentcount, (SELECT count(*) cnt FROM itemlike WHERE itemlike.itemid = item.itemid) AS likecount FROM item LEFT JOIN itemlike ON item.itemid=itemlike.itemid AND itemlike.username=? LEFT JOIN user ON item.username=user.username AND user.username=item.username WHERE item.username like ? or item.itemname like ? or item.description like ? order by itemid desc limit ?, ?', [username, searchkeyword, searchkeyword, searchkeyword, start, size], function(err, results, fields) { 
		if(err) { 
			throw err; 
		} 
		list = results; 
		//전체 데이터 개수 가져오기 
		connection.query('SELECT count(*) cnt FROM item', function(err, results, fields) { 
			if(err) 
				throw err; 
			allcount = results[0].cnt
			//서치한 데이터 개수 가져오기 
			connection.query('SELECT count(*) cnt FROM item WHERE item.username like ? or item.itemname like ? or item.description like ?', [searchkeyword, searchkeyword, searchkeyword], function(err, results, fields) { 
				if(err) 
					throw err; 
				searchcount = results[0].cnt
				//데이터베이스에 SQL 실행 
				connection.query('SELECT * FROM noticheck where username = ?', username, function(err, results, fields) { 
					if (err) throw err; 
					console.log(results.length); 
					if(results.length == 0) {  
						res.json({'noticheck': false, 'allcount':allcount, 'searchcount': searchcount, 'list':list});
					} else { 
						res.json({'noticheck': true, 'allcount':allcount, 'searchcount': searchcount, 'list':list});
					}  
					//close();
				});
			});
		});
	});
});

//username을 기반으로 좋아요 누른 게시판을 페이지 단위 데이터 가져오기
app.get('/item/like/paging', (req, res, next) => { 
	
	//ex http://192.168.0.4/item/paging?pageno=2&count=3&username=we700
	
	//get 방식의 파라미터 가져오기 
	const pageno = req.query.pageno; 
	const count = req.query.count;
	const username = req.query.username;
	
	//데이터를 가져올 시작 위치와 데이터 개수 설정 
	var start = 0;
	var size = 10;
	if(pageno != undefined) {
		if(count != undefined) { 
			size = parseInt(count)
		}
		start = (pageno - 1) * size 
	}
	//시작 위치와 페이지 당 데이터 개수를 설정해서 가져오기 
	var list;
	connect(); 
	
	connection.query('SELECT * FROM (SELECT item.*, CASE WHEN itemlike.likeid IS NULL THEN false ELSE true END AS useritemlike, user.userimgurl AS userimgurl, (SELECT count(*) cnt FROM comment WHERE comment.itemid = item.itemid) AS commentcount, (SELECT count(*) cnt FROM itemlike WHERE itemlike.itemid = item.itemid) AS likecount FROM item LEFT JOIN itemlike ON item.itemid=itemlike.itemid AND itemlike.username=? LEFT JOIN user ON item.username=user.username AND user.username=item.username) a WHERE a.useritemlike = true order by itemid desc limit ?, ?', [username, start, size], function(err, results, fields) { 
		if(err){  
			throw err; 
		} 
		list = results; 
		//전체 데이터 개수 가져오기 
		connection.query('SELECT count(*) cnt FROM (SELECT * FROM (SELECT item.*, CASE WHEN itemlike.likeid IS NULL THEN false ELSE true END AS useritemlike, user.userimgurl AS userimgurl FROM item LEFT JOIN itemlike ON item.itemid=itemlike.itemid AND itemlike.username=? LEFT JOIN user ON item.username=user.username AND user.username=item.username) a WHERE a.useritemlike = true) b', username, function(err, results, fields) { 
			if(err) 
				throw err; 
			res.json({'count': results[0].cnt, 'list':list}); 
			//close();
		});
	});
});

//상세보기 - itemid를 매개변수로 받아서 하나의 데이터를 찾아서 출력해주는 처리 
app.get('/item/getitem/:itemid', (req, res, next) => { 
	var itemid = req.params.itemid; 
	const username = req.query.username;
	//데이터베이스 연결
	connect(); 
	//데이터베이스에 SQL 실행 
	connection.query('SELECT item.*, CASE WHEN itemlike.likeid IS NULL THEN false ELSE true END AS useritemlike, user.userimgurl AS userimgurl, (SELECT count(*) cnt FROM comment WHERE comment.itemid = item.itemid) AS commentcount, (SELECT count(*) cnt FROM itemlike WHERE itemlike.itemid = item.itemid) AS likecount FROM item LEFT JOIN itemlike ON item.itemid=itemlike.itemid AND itemlike.username=? LEFT JOIN user ON item.username=user.username AND user.username=item.username WHERE item.itemid=?', [username, itemid], function(err, results, fields) { 
		if (err) throw err; 
		//데이터가 존재하지 않으면 result에 false를 출력 
		if(results.length == 0) {  
			res.json({'result':false}); 
		} //데이터가 존재하면 result에 true를 출력하고 데이터를 item에 출력 
		else { 
			res.json({'result':true, 'item':results}); 
		} 
		//close();
	});
});

//파일에 이미지 다운로드를 처리
app.get('/item/img/:fileid', function(req, res) {
	var fileId = req.params.fileid; 
	
	//실제 디렉토리 경로로 변경해줘야함
	var file = '/Users/honginjun/Desktop/injun/work/itemServer/public/img' + '/' + fileId; 
	
	console.log("file:" + file); mimetype = mime.lookup(fileId); 
	console.log("file:" + mimetype); 
	res.setHeader('Content-disposition', 'attachment; filename=' + fileId); 
	res.setHeader('Content-type', mimetype); 
	var filestream = fs.createReadStream(file); 
	filestream.pipe(res);
});

//게시물 삽입
app.post('/item/insert', upload.single('imgurl'), (req, res, next) => {
	//파라미터 가져오기
	const username = req.body.username;
	const userimgurl = req.body.userimgurl;
	const itemname = req.body.itemname;
	const description = req.body.description;
	const price = req.body.price;

	//파일 파라미터의 값이 없으면 null을 설정하거나 기본값을 설정
	//기본값을 default.jpg로 설정
	var imgurl; 
	if(req.file) {
		imgurl = req.file.filename 
	} else {
		imgurl = "default.jpg"; 
	}
	connect(); 

	currentDay();
		
	//게시물 삽입 SQL 실행 
	connection.query('insert into item(username, itemname, price, description, imgurl, postdate, updatedate) values(?,?,?,?,?,?,?)', [username, itemname, price, description, imgurl, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second], function(err, results, fields) { 
		if(err) throw err; 
		console.log(results) 
		if(results.affectedRows == 1) { 
			updateDate();
			res.json({'result':true});

		} else {
			res.json({'result':false}); 
		} 
		close();
	});
});

//게시물 수정
app.put('/item/update', upload.single('imgurl'), (req, res, next) => {
	//파라미터 가져오기 
	const itemid = req.body.itemid; 
	const itemname = req.body.itemname; 
	const price = req.body.price; 
	const description = req.body.description; 
	const oldimgurl = req.body.oldimgurl;

	var imgurl; 
	if(req.file) {
		imgurl = req.file.filename 
	}else {
		imgurl = oldimgurl;
	}

	connect();
	
	currentDay();
	
	//게시물 수정 SQL 실행 
	connection.query('update item set itemname=?, price=?, description=?, imgurl=?, updatedate=? where itemid=?', [itemname, price, description, imgurl, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second, itemid], function(err, results, fields) {

		if(err) throw err;
		//영향 받은 행이 있다면 - 성공
		if(results.affectedRows == 1) { 
			updateDate();
			//성공한 경우 true
			res.json({'result':true});
		}else { 
			//성공한 경우 false
			res.json({'result':false}); 
		} 
		close();
	});
});

//게시물 삭제
app.delete('/item/delete/:id', (req, res, next) => { 
	const itemid = parseInt(req.params.id)
	if(!itemid) return res.status(404).send('itemid was not found');
	console.log(itemid); 
	currentDay();

	connect(); 
	//이 게시물의 댓글 삭제 SQL 실행 
	connection.query('delete FROM comment where itemid = ?', itemid, function(err, results, fields) {

		if(err) throw err;
		console.log(results)
		
		//이 게시물의 좋아요 삭제 SQL 실행 
		connection.query('delete FROM itemlike where itemid = ?', itemid, function(err, results, fields) {

			if(err) throw err;
			console.log(results)
			
			//이 게시물 삭제 SQL 실행 
			connection.query('delete FROM item where itemid = ?', itemid, function(err, results, fields) {

				if(err) throw err;
			
				console.log(results)
			
				if(results.affectedRows == 1) { 
					updateDate(); 
					//성공한 경우 true
					res.json({'result':true});
				}else { 
					//성공한 경우 false
					res.json({'result':false});
				}
				close();
			});
		});
	});
});

//댓글 가져오기를 처리해주는 요청
app.get('/item/comment/get/:id', (req, res, next) => {
	const itemid = parseInt(req.params.id)
	if(!itemid) return res.status(404).send('itemid was not found');
	console.log(itemid); 
	//데이터베이스 연결
	connect();
	//읽어온 데이터를 저장할 변수
	var list; 
	//데이터베이스에 SQL 실행 
	connection.query('SELECT * FROM comment where itemid = ? order by commentid desc', itemid, function(err, results, fields) {
		if(err){ 
			throw err;
		}
		//결과 저장
		list = results;
		//전체 데이터 개수 가져오기
		connection.query('SELECT count(*) cnt FROM item', function(err, results, fields) { 
			if(err) throw err; 
			res.json({'count':results[0].cnt, 'list':list}); 
			close();
		});
	});
});

//페이지 단위 댓글 가져오기
app.get('/item/comment/paging', (req, res, next) => { 
	
	//ex http://192.168.0.4/item/comment/paging?pageno=2&count=3&itemid=3
	const itemid = req.query.itemid; 
	if(!itemid) return res.status(404).send('itemid was not found');
	const pageno = req.query.pageno; 
	const count = req.query.count;

	console.log(count); 
	//데이터를 가져올 시작 위치와 데이터 개수 설정 
	var start = 0;
	var size = 10;
	if(pageno != undefined) {
		if(count != undefined) { 
			size = parseInt(count)
		}
		start = (pageno - 1) * size 
	}
	//시작 위치와 페이지 당 데이터 개수를 설정해서 가져오기 
	var list;
	connect(); 
	
	connection.query('SELECT comment.*, user.userimgurl AS userimgurl FROM comment LEFT JOIN user ON comment.username=user.username AND user.username=comment.username WHERE comment.itemid=? order by commentid asc limit 0, 5', [itemid, start, size], function(err, results, fields) { 
		if(err) { 
			throw err; 
		} 
		list = results; 
		//전체 데이터 개수 가져오기 
		connection.query('SELECT count(*) cnt FROM comment where itemid = ?', itemid, function(err, results, fields) { 
			if(err) throw err; 
			res.json({'count':results[0].cnt, 'list':list}); 
			//close();
		});
	});
});

//댓글 삽입
app.post('/item/comment/insert', (req, res) => {
	//파라미터 가져오기
	const itemid = req.body.itemid;
	const username = req.body.username;
	const comment = req.body.comment;
	const tousername = req.body.tousername;
	
	var commentresults
	const commenttrue = true
	
	connect(); 

	currentDay();
		
	//댓글 삽입 SQL 실행 
	connection.query('insert into comment(itemid, username, comment, postdate, updatedate) values(?,?,?,?,?)', [itemid, username, comment, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second], function(err, results, fields) { 
		if(err) throw err; 
		console.log(results) 
		commentresults = results
		
		let commentid = commentresults.insertId
		
		//알림 SQL 실행 
		connection.query('insert into noti(username, commenttrue, itemid, commentid, postdate) values(?,?,?,?,?)', [username, commenttrue, itemid, commentid, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second], function(err, results, fields) { 
			if(err) throw err; 
			console.log(results) 
		
			//알림 SQL 실행 
			connection.query('insert into noticheck(username) values(?)', tousername, function(err, results, fields) { 
				if(err) throw err; 
				console.log(results) 
			
				if(commentresults.affectedRows == 1 ) { 
					updateDate(); //아이템의 마지막 업데이트 시간 변경
					commentUpdateDate(); //댓글의 마지막 업데이트 시간 변경
					res.json({'result':true}); 
		
				} else {
					res.json({'result':false}); 
				} 
				close();
			});
		});
	});
});

//댓글 수정
app.put('/item/comment/update', (req, res) => {
	//파라미터 가져오기
	const commentid = req.body.commentid;
	const comment = req.body.comment;

	connect(); 

	currentDay();
		
	//댓글 삽입 SQL 실행 
	connection.query('update comment set comment=?, updatedate=? where commentid=?', [comment, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second, commentid], function(err, results, fields) { 
		if(err) throw err; 
		console.log(results) 
		
		if(results.affectedRows == 1) { 
			commentUpdateDate();
			res.json({'result':true});

		} else {
			res.json({'result':false}); 
		} 
		close();
	});
});

//댓글 삭제
app.delete('/item/comment/delete', (req, res, next) => { 
	
	//ex http://192.168.0.4/item/comment/delete?commentid=2&itemid=3
	const commentid = req.query.commentid; 
	if(!commentid) return res.status(404).send('commentid was not found');
	const itemid = req.query.itemid; 
	if(!itemid) return res.status(404).send('itemid was not found');
	
	currentDay();

	connect(); 
	
	//댓글 삭제 SQL 실행  
	connection.query('delete FROM comment where commentid = ?', commentid, function(err, results, fields) {

		if(err) throw err;
		console.log(results)
		
		//댓글 삭제 SQL 실행  
		connection.query('delete FROM noti where commentid = ?', commentid, function(err, results, fields) {

			if(err) throw err;
			console.log(results)
			
			if(results.affectedRows == 1 ) { 
				updateDate(); //아이템의 마지막 업데이트 시간 변경
				commentUpdateDate(); //댓글의 마지막 업데이트 시간 변경
				res.json({'result':true}); 

			} else {
				res.json({'result':false}); 
			} 
			close();
		});
	});
});

//좋아요 삽입
app.post('/item/like/insert', (req, res) => {
	//파라미터 가져오기
	const itemid = req.body.itemid;
	const username = req.body.username;
	const tousername = req.body.tousername;
	
	var likeresults
	
	const commenttrue = false
	
	connect(); 

	currentDay();
	
	//좋아요 삽입 SQL 실행 
	connection.query('insert into itemlike(itemid, username) values(?,?)', [itemid, username], function(err, results, fields) { 
		if(err) throw err; 
		console.log(results) 
		likeresults = results
		
		//알림 SQL 실행 
		connection.query('insert into noti(username, commenttrue, itemid, postdate) values(?,?,?,?)', [username, commenttrue, itemid, year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second], function(err, results, fields) { 
			if(err) throw err; 
			console.log(results) 
		
			//알림 SQL 실행 
			connection.query('insert into noticheck(username) values(?)', tousername, function(err, results, fields) { 
				if(err) throw err; 
				console.log(results) 
			
				if(likeresults.affectedRows == 1 ) { 
					updateDate(); //아이템의 마지막 업데이트 시간 변경
					res.json({'result':true}); 
		
				} else {
					res.json({'result':false}); 
				} 
				close();
			});
		});
	});
});

//좋아요 삭제
app.delete('/item/like/delete', (req, res, next) => { 
	
	//ex http://192.168.0.4/item/like/delete?itemid=3&username=we700
	const itemid = req.query.itemid; 
	if(!itemid) return res.status(404).send('itemid was not found');
	const username = req.query.username; 
	if(!username) return res.status(404).send('username was not found');
	
	currentDay();

	connect(); 
	
	//좋아요 삭제 SQL 실행  
	connection.query('DELETE FROM itemlike where itemid=? and username=?', [itemid, username], function(err, results, fields) {

		if(err) throw err;
		console.log(results)
		
		//좋아요 삭제 SQL 실행  
		connection.query('DELETE FROM noti where itemid=? and commenttrue=false', itemid, function(err, results, fields) {

			if(err) throw err;
			console.log(results)
			
			if(results.affectedRows == 1 ) { 
				updateDate(); //아이템의 마지막 업데이트 시간 변경
				res.json({'result':true}); 

			} else {
				res.json({'result':false}); 
			} 
			close();
		});
	});
});

//로그인 로그를 페이지 단위로 조회
app.get('/user/loginlog/paging', (req, res, next) => { 
	
	//ex http://192.168.0.4/user/loginlog/paging?pageno=2&count=3&userid=3
	const userid = req.query.userid; 
	if(!userid) return res.status(404).send('userid was not found');
	const pageno = req.query.pageno; 
	const count = req.query.count;

	console.log(count); 
	//데이터를 가져올 시작 위치와 데이터 개수 설정 
	var start = 0;
	var size = 10;
	if(pageno != undefined) {
		if(count != undefined) { 
			size = parseInt(count)
		}
		start = (pageno - 1) * size 
	}
	//시작 위치와 페이지 당 데이터 개수를 설정해서 가져오기 
	var list;
	connect(); 
	
	connection.query('select * from loginlog where userid=? order by loginlogid desc limit ?, ?', [userid, start, size], function(err, results, fields) { 
		if(err) { 
			throw err; 
		} 
		list = results; 
		//전체 데이터 개수 가져오기 
		connection.query('select count(*) cnt from loginlog where userid = ?', userid, function(err, results, fields) { 
			if(err) throw err; 
			res.json({'count':results[0].cnt, 'list':list}); 
			//close();
		});
	});
});

//탈퇴하기
app.delete('/user/delete', (req, res, next) => { 
	
	//ex http://192.168.0.4/item/like/delete?userid=admin&username=admin
	const userid = req.query.userid; 
	if(!userid) return res.status(404).send('userid was not found');
	const username = req.query.username; 
	if(!username) return res.status(404).send('username was not found');
	
	var userResults
	
	currentDay();

	connect(); 
	
	//유저 삭제 SQL 실행  
	connection.query('DELETE FROM user where userid = ?', userid, function(err, results, fields) {

		if(err) throw err;
		console.log(results)
		userResults = results
		
		//아이템 게시물 삭제 SQL 실행  
		connection.query('DELETE FROM item where username = ?', username, function(err, results, fields) {

			if(err) throw err;
			console.log(results)
			
			//좋아요 삭제 SQL 실행  
			connection.query('DELETE FROM itemlike where username = ?', username, function(err, results, fields) {

				if(err) throw err;
				console.log(results)
						
				//댓글 삭제 SQL 실행  
				connection.query('DELETE FROM comment where username = ?', username, function(err, results, fields) {

					if(err) throw err;
					console.log(results)
						
					//로그인 로그 삭제 SQL 실행  
					connection.query('DELETE FROM loginlog where userid = ?', userid, function(err, results, fields) {

						if(err) throw err;
						console.log(results)
								
						//노티 삭제 SQL 실행  
						connection.query('DELETE FROM noti where username = ?', username, function(err, results, fields) {
	
							if(err) throw err;
							console.log(results)
											
							//노티 삭제 SQL 실행  
							connection.query('DELETE FROM noticheck where username = ?', username, function(err, results, fields) {
		
								if(err) throw err;
								console.log(results)
												
								if(userResults.affectedRows == 1 ) { 
									updateDate(); //아이템의 마지막 업데이트 시간 변경
									res.json({'result':true}); 
								} else {
									res.json({'result':false}); 
								} 
								//close();
							});	
						});	
					});
				});
			});
		});					
	});
});


//페이지 단위 알림 가져오기
app.get('/user/noti/paging', (req, res, next) => { 
	
	//ex http://192.168.0.4/user/noti/paging?pageno=2&count=3&username=3
	const username = req.query.username; 
	if(!username) return res.status(404).send('username was not found');
	const pageno = req.query.pageno; 
	const count = req.query.count;

	console.log(count); 
	//데이터를 가져올 시작 위치와 데이터 개수 설정 
	var start = 0;
	var size = 10;
	if(pageno != undefined) {
		if(count != undefined) { 
			size = parseInt(count)
		}
		start = (pageno - 1) * size 
	}
	//시작 위치와 페이지 당 데이터 개수를 설정해서 가져오기 
	var list;
	connect(); 
	
	connection.query('SELECT * FROM (SELECT noti.*, user.userimgurl AS userimgurl, item.username AS tousername FROM noti LEFT JOIN user ON noti.username=user.username AND user.username=noti.username LEFT JOIN item ON noti.itemid=item.itemid) a WHERE a.tousername=? order by notiid desc limit ?, ?', [username, start, size], function(err, results, fields) { 
		if(err) { 
			throw err; 
		} 
		list = results; 
		//전체 데이터 개수 가져오기 
		connection.query('SELECT count(*) cnt FROM (SELECT noti.*, user.userimgurl AS userimgurl, item.username AS tousername FROM noti LEFT JOIN user ON noti.username=user.username AND user.username=noti.username LEFT JOIN item ON noti.itemid=item.itemid) a WHERE a.tousername=?', username, function(err, results, fields) { 
			if(err) throw err; 
			res.json({'count':results[0].cnt, 'list':list}); 
			//close();
		});
	});
});

//알림 삭제
app.delete('/user/noti/delete', (req, res, next) => { 
	
	//ex http://192.168.0.4/user/noti/delete?&username=we700
	const username = req.query.username; 
	if(!username) return res.status(404).send('username was not found');
	
	connect(); 
	
	//알림 삭제 SQL 실행  
	connection.query('DELETE FROM noti WHERE itemid in (SELECT a.itemid FROM (SELECT noti.*, item.username AS tousername FROM noti LEFT JOIN item ON noti.itemid=item.itemid) a WHERE a.tousername=?)', username, function(err, results, fields) {

		if(err) throw err;
		console.log(results)
		
		if(results.affectedRows == 1 ) { 
			res.json({'result':true}); 

		} else {
			res.json({'result':false}); 
		} 
		//close();
	});
});


//알람체크 삭제
app.delete('/user/noticheck/delete', (req, res, next) => { 
	
	//ex http://192.168.0.4/item/like/delete?itemid=3&username=we700
	const username = req.query.username; 
	if(!username) return res.status(404).send('username was not found');
	
	currentDay();

	connect(); 
	
	//알림체 삭제 SQL 실행  
	connection.query('DELETE FROM noticheck where username=?', username, function(err, results, fields) {

		if(err) throw err;
		console.log(results)
		
		if(results.affectedRows == 1 ) { 
			res.json({'result':true}); 
		} else {
			res.json({'result':false}); 
		} 
		close();	
	});
});

//프로젝트의 update.txt 파일에 마지막 업데이트 시간을 알려주는 코드
app.get('/item/lastupdatetime', (req, res, next) => { 
	fs.readFile('./update.txt', function (err, data) { 
		res.json({'result':data.toString()}); 
	}); 
});

//프로젝트의 update.txt 파일에 마지막 업데이트 시간을 알려주는 코드
app.get('/item/comment/lastupdatetime', (req, res, next) => { 
	fs.readFile('./commentupdate.txt', function (err, data) { 
		res.json({'result':data.toString()}); 
	}); 
});

/*
웹 영역 --시작--
*/

//전체 보기 페이지 이동 
app.get('/item/all', (req, res) => { 
	//페이지 이동 
	res.sendFile(path.join(__dirname, '/item/all.html')); 
});

//페이지 단위 보기 페이지 이동 
app.get('/item/list', (req, res) => { 
	res.sendFile(path.join(__dirname, '/item/list.html')); 
});

//상세보기 페이지로이동 - itemid를 매개변수로 받아서 하나의 데이터를 찾아서 출력해주는 처리 
app.get('/item/detail', (req, res, next) => {
	itemid = req.params.itemid;
	//페이지 이동 
	res.sendFile(path.join(__dirname, '/item/detail.html')); 
});

//삽입 페이지로 이동
app.get('/item/insert', (req, res) => { 
	res.sendFile(path.join(__dirname, '/item/insert.html')); 
});

//수정 페이지로 이동
//app.get('/item/update', (req, res, next) => { 
//	res.sendFile(path.join(__dirname, '/item/update.html')); 
//});

/*
웹 영역 --끝--
*/


function close(){ 
	console.log('mysql connection close'); 
	connection.end(); 
}

//서버 실행 
app.listen(app.get('port'), () => { 
	console.log(app.get('port'), '번 포트에서 대기 중'); 
});

app.get('/', (req, res) => { 
	res.sendFile(path.join(__dirname, '/index.html')); 
})




