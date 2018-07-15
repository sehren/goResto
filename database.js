var express = require ('express'),
	mysql = require ('mysql'),
	bodyParser = require('body-parser'),
	nodemailer = require('nodemailer'),
	nunjuks = require('nunjucks'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	cors = require('cors'),
	jwt = require('json-web-token'),
	multer = require('multer'),
	session = require('express-session'),
	cookieParser = require('cookie-parser'),
	fs = require('fs'),
	path = require('path'),
	moment = require('moment'),
	algorithm = require('./algo.js'),
	convert = require('./converter.js')
	knex = require('knex')({
	client : 'mysql',
	connection : {
		host : 'localhost',
		user : 'root',
		password : '',
		database : 'taDB',
		port : '3306'
	}
});

app.use(bodyParser.json());
app.use(cors())
var PATH_TO_TEMPLATES = '.';
nunjuks.configure( PATH_TO_TEMPLATES,{
	autoescape: true,
	express:app
});

app.post('/login',function(req,res){
	var user = req.body
	knex.select('*').from('user').where({email:user.email,password:user.password}).then(function(check){
		if(JSON.stringify(check)=='[]')
			res.json("unvalid")
		else if(check[0].email==user.email){
			res.json({name : check[0].name,email : check[0].email})
		}
	})
})
app.post('/register',function(req,res){
	var user = req.body
	knex.select('*').from('user').where('email',user.email).then(function(check){
		if(JSON.stringify(check)=='[]'){
			var Rand = Math.floor((Math.random() * 10000000) + 1)+"&"+user.email
			knex('user').insert({email:user.email,password:user.password,name:user.name,token : Rand,isActive : 0}).then(function(rows){
				res.json("valid");
				var transporter = nodemailer.createTransport({
				  service: 'gmail',
				  host : 'smtp.gmail.com',
				  port : 465,
				  secure : false,
				  auth: {
				    user: 'infogoresto@gmail.com',
				    pass: 'sukhi123'
				  }
				});
				var mailOptions = {
					from : 'infogoresto@gmail.com',
					to: user.email,
					subject : "hi "+user.name+" Please Activate your Account",
					html : "<p>Click link bellow to Activate your account </p><a href='http://localhost:3000/register/auth/"+Rand+"'>Click Me<a>"
				}
				transporter.sendMail(mailOptions, function(error, info){
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				});
			})
		}
		else
			res.json("unvalid")
	})
})
app.get('/register/auth/:token',function(req,res){
 var token = req.params.token
 var pisah = token.split("&")
 knex.select('*').from('user').where('email',pisah[1]).then(function(data){
 	if(data[0].token == token && data[0].isActive==0){
 		knex('user').update('isActive','1').where('email',data[0].email).then(function(rows){
 			res.render('success.html')
 		},err=>{
 			res.render('error.html')
 		})
 	}
 	else if(data[0].isActive==1)
 		res.render('active.html')
 	else
 		res.render('error.html')
 })
},err=>{
	res.render('error.html');
})
app.get("/home",function(req,res){
	knex.select('*').from('usermenu').then(function(data){
		res.end(JSON.stringify(data))
	})
})
app.post('/change-user',function(req,res){
	data = req.body
	knex.select('*').from('user').then(function(row){
		if(data.email!=data.idUser){
			var istr = false
			for(var i=0;i<row.length;i++){
				if(row[i].email==data.email){
					istr = true
					res.send({text : "email sudah digunakan",isvalid : false})
					break;
				}
			}
			if(!istr)
				knex('user').update({email : data.email,name : data.name}).where('email',data.idUser).then(function(ro){
					res.send({text : 'data berhasil diubah', isvalid : true})
				})
		}
		else{
			knex('user').update({email : data.email,name : data.name}).where('email',data.idUser).then(function(ro){
				res.send({text : 'data berhasil diubah', isvalid : true})
			})
		}
	})
})
app.get("/user-category",function(req,res){
	knex.select('*').from('restoran').where('status','true').then(function(rows){
		var date = moment().format("HH:mm")
		var depan = []
		var belakang = []
		for(var i = 0 ; i<rows.length;i++){
			if(date>rows[i].buka && date<rows[i].tutup){
				rows[i].time = "buka"
				depan.push(rows[i])
			}
			else{
				rows[i].time = "tutup"
				belakang.push(rows[i])
			}
		}
		rows = depan.concat(belakang)
		res.send(rows)
	})
})
app.post('/inside',function(req,res){
	knex.select('*').from('menu').where(req.body).then(function(menu){
		knex.select('*').from('jenis').where(req.body).then(function(jenis){
			res.send({menu : menu,jenis : jenis})
		})
	})
})
app.post('/cart',function(req,res){
	var data = req.body;
	knex.select('*').from('cart').where('idUser',data.idUser).then(function(rows){
		if(rows[0] != undefined){
			var temp = rows[0].data
			knex('cart').update({idUser : data.idUser,idOwner : data.idOwner,total : data.total,data : JSON.stringify(data.data)}).where('idUser',rows[0].idUser).then(function(row){
				res.json()
			})
		}
		else{
			knex('cart').insert({idUser : data.idUser,idOwner : data.idOwner,total : data.total,data : JSON.stringify(data.data)}).then(function(row){
				res.json()
			})
		}
	})
})
app.post('/update-cart',function(req,res){
	var auth = req.session
	data = req.body
	// console.log(data.data)
	knex('cart').update({total : data.total,data : JSON.stringify(data.data)}).where({idOwner : data.idOwner,idUser : data.idUser}).then(function(row){
		res.json()
	})
})
app.post('/getcart',function(req,res){
	var data = req.body
	knex.select('*').from('cart').where('idUser',data.id).then(function(row){
		var data
		if(row[0]!=undefined){
			row[0].data = JSON.parse(row[0].data)
			res.json(row)
		}
		else{
			data = [{data : []}]
			res.json(data)
		}
	})
})
app.post('/updateCart',function(req,res){
	var data = req.body
	// console.log(data.cart)
	if(data.cart==""){
		console.log("masuk")
		knex('cart').where('idUser',data.id).del().then(function(row){
			res.json()
		})
	}
	else
		knex('cart').update({total : data.total,data:JSON.stringify(data.cart)}).where('idUser',data.id).then(function(row){
			res.json()
		})
})
app.get('/getdata/:data',function(req,res){
	var data = req.params.data;
	knex.select('*').from('restoran').where('idOwner',data).then(function(resto){
		res.json(resto[0])
	})
})
app.get('/history/:data',function(req,res){
	var data = req.params.data
	knex('myorder').join('restoran','restoran.idOwner','=','myorder.idOwner')
	.select('restoran.namaRestoran',
		'myorder.idOrder',
		'myorder.idUser',
		'myorder.idOwner',
		'myorder.data',
		'myorder.isAuth',
		'myorder.noMeja',
		'myorder.price',
		'myorder.status',
		'myorder.statusOrder',
		'myorder.timeOrder').where('idUser',data).then(function(history){
		res.json(history)
	})
})
app.post('/filter',function(req,res){
	knex.select('*').from('menu').where('')
})
app.post('/checkCart',function(req,res){
	var data = req.body
	knex.select('*').from('cart').where('idUser',data.idUser).then(function(rows){
		var istrue = false
		var idowner = data.idOwner;
		for(var i = 0;i<rows.length;i++){
			if(rows[i].idOwner!=data.idOwner){
				istrue = true
				idowner = rows[i].idOwner
				break;
			}
		}
			if(istrue){
				knex.select('namaRestoran').from('restoran').where('idOwner',idowner).then(function(namaResto){
					res.json({istrue : true,idOwner : idowner,namaresto : namaResto[0].namaRestoran})
				})
			}
			else
				res.json({istrue:false,idOwner : idowner})
	})
})
app.post('/hapusCart',function(req,res){
	knex("cart").where("idUser",req.body.idUser).del().then(function(d){
		res.json()
	})
})


app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret: 'ssshhhhh'}));
var auth;

app.post('/admin-login',function(req,res){
	auth = req.session;
	var data = req.body
	knex.select('*').from('owner').where({email : data.email,password:data.password}).then(function(ev){
		if(ev[0]!=undefined){
			auth.name = ev[0].name
			auth.email = ev[0].email
			auth.islog = true;
			auth.idOwner = ev[0].idOwner;
			res.redirect('/')
			
		}
		else{
			auth.islog=false
			res.render('web/index.html',{message:"Email atau Password salah"})
		}
	})
})

app.get('/register',function(req,res){
	auth = req.session
	if(!auth.islog)
		res.render('web/register.html')
	else
		res.redirect('/')
})
app.post('/admin-register',function(req,res){
	var data = req.body
	auth = req.session
	knex.select('*').from('owner').where('email',data.email).then(function(ev){
		if(ev[0]==undefined){
			knex('owner').insert(data).then(function(rows){
				auth.email = data.email;
				auth.name = data.name;
				auth.idOwner = rows[0]
				auth.islog = true;
				res.redirect('/')
			})
		}
		else{
			auth.islog=false
			res.render('web/register.html',{message:"Email yang sama telah digunakan"})
		}
	})
})
app.post('/getOrder',function(req,res){
	data = req.body
	knex.select('*').from('myorder').where('idOrder',data.idOrder).then(function(row){
		res.send(row[0])
	})
})
io.on('connection',function(socket){
	socket.on('order',(pesan)=>{
		knex('myOrder').insert(pesan).then(function(row){
			knex.select('name').from('user').where('email',pesan.idUser).then(function(name){
				pesan.name = name[0].name
				pesan.idOrder = row[0]
				io.emit(pesan.idUser+'sukses',{idOrder : pesan.idOrder})
				io.emit(pesan.idOwner,{pesan})
				knex.select('doTimeOut').from('owner').where('idOwner',pesan.idOwner).then(function(timeOut){
					if(timeOut[0].doTimeOut == false){
						console.log(timeOut)
						setTimeout(timeOutOrder,119000,pesan.idOwner)
						knex('owner').update('doTimeOut',true).where('idOwner',pesan.idOwner).then(function(ev){})
					}
				})
			})
		})
	})
	socket.on('isAuth',(pesan)=>{
		knex('myorder').update({isAuth : pesan.isAuth}).where('idOrder',pesan.idOrder).then(function(event){
			io.emit('isValid'+pesan.idOrder,true)
		})
	})
	socket.on('notAuth',(pesan)=>{
		knex('myorder').update({status:'closed',isAuth:false}).where('idOrder',pesan.idOrder).then(function(event){
			io.emit('isValid'+pesan.idOrder,false)
		})
	})
	socket.on('bayar',(id)=>{
		knex('myorder').update({isBayar : true}).where('idOrder',id.idOrder).then(function(event){
			knex.select('*').from('myorder').where({idOwner : id.idOwner,idOrder : id.idOrder,isBayar : true}).then(function(ro){
				io.emit('requestBayar'+id.idOwner,{data : ro})
			})
		})
	})
})
function timeOutOrder(idOwner){
	console.log(idOwner)
	knex.select('*').from('myorder').where({idOwner : idOwner, statusOrder : 'mengerjakan'}).then(function(statusOrder){
		knex('myorder').update({status : 'closed',statusOrder : statusOrder[0]==null ? 'mengerjakan':'waiting'}).where({status:'open',idOwner:idOwner}).then(function(data){
			knex('owner').update('doTimeOut',false).where('idOwner',idOwner).then(function(dt){
				if(statusOrder[0]==null){
					knex.select('*').from('menukoki').where('idOwner',idOwner).then(function(menuKoki){
						knex.select('*').from('myorder').where({idOwner:idOwner,statusOrder : 'mengerjakan'}).then(function(myOrder){
							io.emit('updateStatus',myOrder)
							var koki = convert.convertKoki(menuKoki)
							var order = convert.convertOrder(myOrder)
							var algo = algorithm.acoTabu(koki,order)
							for(var i=0;i<algo.length;i++){
								algo[i].idUser = JSON.stringify(algo[i].idUser)
								algo[i].waktuMasuk = new Date()
							}
							knex('pembuatan').insert(algo).then(function(myPembuatan){

							})
						})
					})
				}
			})
		})
	})
}

app.get('/',function(req,res){
	auth = req.session;
	if(auth.islog){
		var data = [];
		knex.select('*').from('menu').where('idOwner',auth.idOwner).then(function(menu){
			knex.select('*').from('jenis').where('idOwner',auth.idOwner).then(function(jenis){
				res.render('web/dashboard.html',{menu : menu,data : jenis,name : auth.name,idOwner : auth.idOwner})
			})
		})
	}
	else
		res.render('web/index.html')
})
app.get('/logout',function(req,res){
	req.session.destroy(function (err) {
		if(!err)
			res.redirect('/');
	})
})
app.get('/restoran',function(req,res){
	auth = req.session
	if(auth.islog){
		knex.select("*").from("restoran").where('idOwner',auth.idOwner).then(function(ev){
			res.render('web/restoran.html',{idOwner : auth.idOwner,name : auth.name,resto : ev[0]})
		})
	}
})
app.get('/koki',function(req,res){
	auth = req.session
	if(auth.islog){
		knex.select("*").from('koki').where('idOwner',auth.idOwner).then(function(koki){
			knex.select("*").from('menuKoki').where('idOwner',auth.idOwner).then(function(menuKoki){
				knex.select('*').from('jenis').where('idOwner',auth.idOwner).then(function(menu){
					res.render('web/koki.html',{idOwner : auth.idOwner,name : auth.name, koki : koki,menuKoki : menuKoki, menuJenis : menu})
				})
			})
		})
	}
})
app.get('/pembayaran',function(req,res){
	auth.req.session
	if(auth.islog){
		knex('myorder').join('user','myorder.idUser','=','user.email').select('*').where({idOwner:auth.idOwner,isBayar : true}).then(function(row){
			for(var i=0;i<row.length;i++){
				row[i].data = JSON.parse(row[i].data)
			}
			res.render('web/pembayaran.html',{idOwner : auth.idOwner,name : auth.name,order : row})
		})
	}
})
app.get('/pembuatan',function(req,res){
	auth = auth.req.session
	if(auth.islog){
		knex.select('*').from('pembuatan').where('idOwner',auth.idOwner).then(function(data){
			knex.select('*').from('koki').where('idOwner',auth.idOwner).then(function(koki){
				for(var i=0;i<data.length;i++){
					data[i].idUser = JSON.parse(data[i].idUser)
				}
				res.render('web/pembuatan.html',{name : auth.name,idOwner : auth.idOwner,data : data, koki : koki})
			})
		})
	}
})
app.get('/pesanan-masuk',function(req,res){
	auth = req.session
	if(auth.islog){
		knex('myorder').join('user','myorder.idUser','=','user.email').select('*').where('idOwner',auth.idOwner).then(function(order){
			for(var i=0;i<order.length;i++){
				order[i].data = JSON.parse(order[i].data)
			}
			// var result = algorithm.acoTabu()
			// console.log(result)
			res.render('web/pesanan-masuk.html',{name : auth.name, idOwner : auth.idOwner,order : order})
		})
	}
})

var Storage = multer.diskStorage({
	destination: function(req, file, callback) {
	    callback(null, "web/images/cover-restoran");
	},
	filename: function(req, file, callback) {
	    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
	}
});

var uploading = multer({

    storage : Storage

});
 app.post("/api/Upload", uploading.single('image'),function(req, res) {
 	auth = req.session;
 	var idOwner = auth.idOwner;
 	var path = req.file.filename
 	knex.select('imageName').from('restoran').where('idOwner',idOwner).then(function(rows){

 		if(rows[0].imageName!='')
 			fs.unlink('web/images/cover-restoran/'+rows[0].imageName)
 		knex('restoran').update('imageName',path).where('idOwner',idOwner).then(function(row){
	 		res.send(req.file)
	 	})
 	})
 });
 app.post("/menu/Upload", uploading.single('image'),function(req, res) {
 	auth = req.session;
 	var idOwner = auth.idOwner;
 	var path = req.file.filename
 	var id = auth.idMakanan
 	knex.select('*').from('jenis').where('idMakanan',id).then(function(rows){

 		if(rows[0].picture !='')
 			fs.unlink('web/images/cover-restoran/'+rows[0].picture)
 		knex('jenis').update('picture',path).where('idMakanan',id).then(function(row){
	 		res.send(req.file)
	 	})
 	})
 });

app.get('/cover-restoran/:file',function(req,res){
	res.sendFile(path.resolve('web/images/cover-restoran/'+req.params.file))
})

app.use(express.static(__dirname + '/web'));
app.post('/next-menu',function(req,res){
	auth = req.session
	knex('myorder').update('statusOrder','selesai').where({statusOrder : 'mengerjakan',idOwner : auth.idOwner}).then(function(ro){
		knex.select('*').from('myorder').where({idOwner : auth.idOwner,statusOrder : 'waiting'}).then(function(myOrder){
			knex.select('*').from('menukoki').where({idOwner : auth.idOwner}).then(function(menuKoki){
				var koki = convert.convertKoki(menuKoki)
				var order = convert.convertOrder(myOrder)
				var algo = algorithm.acoTabu(koki,order)
				for(var i=0;i<algo.length;i++){
					algo[i].idUser = JSON.stringify(algo[i].idUser)
					algo[i].waktuMasuk = new Date()
				}
				knex('pembuatan').where({idOwner : auth.idOwner}).del().then(function(tr){
					knex('pembuatan').insert(algo).then(function(myPembuatan){
						knex('myorder').update('statusOrder','mengerjakan').where({statusOrder : 'waiting',idOwner : auth.idOwner}).then(function(re){				
							knex.select('*').from('myorder').where({idOwner : auth.idOwner}).then(function(jj){
								io.emit('updateStatus',jj)
								res.end("sukses")
							})
						})
					})
				})
				
			})
		})
	})
})
app.post('/batalPesanan',function(req,res){
	idOrder  = req.body.idOrder
	knex('myorder').update({statusOrder:"batal",isAuth : false,status:'closed'}).where({idOrder : idOrder}).then(function(row){
		console.log(row,idOrder)
		res.json({berhasilBatal : true})
	})
})
app.post('/koki/:paramKoki',function(req,res){
	auth = req.session
	var data = req.body;
	if(req.params.paramKoki == "tambah-koki"){
		knex('koki').insert({namaKoki : data.name,idOwner : auth.idOwner}).then(function(rows){
			res.end("sukses")
		})
	}
	else if(req.params.paramKoki == "tambah-menuKoki"){
		knex('menuKoki').insert({nama : data.nama,idOwner : auth.idOwner, estimasi : data.estimasi,idMakanan : data.idMakanan,idKoki : data.idKoki}).then(function(rows){
			res.end("sukses")
		})
	}
	else if(req.params.paramKoki == "hapus-koki"){
		knex('menuKoki').where('idKoki',data.type).del().then(function(ev){
			knex('koki').where('idKoki',data.type).del().then(function(koki){
				res.end("sukses")
			})
		})
	}
})
app.post('/dashboard/:tambah',function(req,res){
	auth = req.session;
	var data = req.body
	if(req.params.tambah == "tambah-menu"){
		knex('menu').insert({namaMenu : data.name,idOwner : auth.idOwner}).then(function(rows){
	  		res.end("sukses")
	  	})
	}
	else if(req.params.tambah == "tambah-jenis"){
		auth = req.session
		knex.select('*').from('menu').where({namaMenu : data.type}).then(function(ev){
			data.idOwner = auth.idOwner
			data.idMenu = ev[0].idMenu;
			knex('jenis').insert({idOwner : auth.idOwner,nama : data.nama,price:data.price,idMenu : ev[0].idMenu}).then(function(rows){
				auth.idMakanan = rows[0]
				res.end("sukses")
			})
		})
	}
	else if(req.params.tambah  == "hapus-menu"){
		knex.select('*').from('menu').where('namaMenu',data.type).then(function(ev){
			knex('menu').where('namaMenu',data.type).del().then(function(rows){
				knex('jenis').where('idMenu',ev[0].idMenu).del().then(function(row){
					res.end("sukses")
				})
			})
		})
	}
	else if(req.params.tambah =="data-resto"){
		data.idOwner = auth.idOwner
		// upload(data.image, res, function(err) {
		//     if (err) {
		//         return res.end("Something went wrong!");
		//     }
		//     return res.end("File uploaded sucessfully!.");
		// });
		knex.select('*').from('restoran').where('idOwner',auth.idOwner).then(function(stat){
			if(stat[0]==null){
				knex('restoran').insert(data).then(function(rows){
					res.end("sukses")
				})
			}
			else{
				knex('restoran').update(data).where('idOwner',auth.idOwner).then(function(rows){
					res.end("sukses")
				})
			}
		})
	}
})
app.get('/search/:data',function(req,res){
	keywoard = req.params.data
	knex.select('*').from('restoran').where('namaRestoran','like','%'+keywoard+'%').then(function(rows){
		var date = moment().format("HH:mm")
		var depan = []
		var belakang = []
		for(var i = 0 ; i<rows.length;i++){
			if(date>rows[i].buka && date<rows[i].tutup){
				rows[i].time = "buka"
				depan.push(rows[i])
			}
			else{
				rows[i].time = "tutup"
				belakang.push(rows[i])
			}
		}
		rows = depan.concat(belakang)
		res.json(rows)
	})
})

// io.on('connection', function(socket){
//   socket.on('chat message',function(msg){
//   	
//   })
// });
app.get('/*',function(req,res){
	res.render('error.html');
})

http.listen(3000,function(){
	console.log("server running on 3000");
});

