//jshint esversion:6
require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session = require('express-session');

const passport=require("passport");

const passportLocalMongoose=require("passport-local-mongoose");

const GoogleStrategy = require('passport-google-oauth20').Strategy;

const findOrCreate=require("mongoose-findorcreate");






const app=express();






//console.log("week password: "+ md5("123456"));
//console.log("strong password: "+md5("hwnJIjhsINIWUUIE8556"));
//console.log(process.env.API_KEY);
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: true,

  }));
  app.use(passport.initialize());
  app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/registerDB",{useNewUrlParser:true});
//mongoose.set("useCreateIndex",true);
const userSchema= new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
  secret: String
});
userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);



const User=mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user,done){
    done(null, user.id);
});
passport.deserializeUser(function(id,done){
    User.findById(id, function(err,user){
        done(err,user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/register",
    //userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));







app.get("/",function(req,res){
    res.render("home");
});
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/after",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/after");
  });

app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});

app.get("/after", function(req, res){
  User.find({"after": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("after", {usersWithSecrets: foundUsers});
      }
    }
  });
});


app.post("/register", function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/after");
                console.log("successfully registed");
            });
        }
    });


     //remove or comment this line before passport
  /*  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser= new User({
            email:req.body.username,
            password:hash
        });
        newUser.save(function(err){
            if(err){
                console.log(err);
            }
            else{
                res.render("secrets");
            }
        });
    });*/

});
app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/after");
      });
    }
  });

});

app.listen(process.env.PORT || 3000, function(){
    console.log("server started");
})
