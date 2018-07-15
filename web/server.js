var express = require ('express')
var mysql = require ('mysql')
var bodyParser = require('body-parser')
var nodemailer = require('nodemailer')
var	nunjuks = require('nunjucks')
var app = express();
var request = require('request');
var path = require('path')
var knex = require('knex')({
	client : 'mysql',
	connection : {
		host : 'localhost',
		user : 'root',
		password : '',
		database : 'taDB'
	}
});
app.use(bodyParser.json());
app.use(function(req,res,next){
	res.setHeader('Access-Control-Allow-Origin','*');
	res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS,PUT,PATCH,DELETE');
	res.setHeader('Access-Control-Allow-Headers','X-Requested with,content-type');
	res.setHeader('Access-Control-Allow-Credentials','true');
	next();
})
var PATH_TO_TEMPLATES = '.';
nunjuks.configure( PATH_TO_TEMPLATES,{
	autoescape: true,
	express:app
});
app.use(express.static(__dirname + '/'));
app.get("/",function(req,res){
	res.sendFile(__dirname + '/index.html');
})
app.listen(3001,function(){
	console.log("server running on 3000");
});