require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SECRET,                                     // Put here your secret key from .env file.
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const secretsSchema = new mongoose.Schema({ content: String });

const Secret = new mongoose.model("Secret", secretsSchema);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secrets: [secretsSchema]
});

userSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    console.log("Accessing secrets!");
    if(req.isAuthenticated()){
        if(req.user.secrets){
            res.render("secrets", {secrets: req.user.secrets});
        }
        
    } else {
        res.redirect("/login");
    }
});

app.post("/register", function(req,res){
    console.log('registering user');
    User.register(new User({username: req.body.username}), req.body.password, function(err) {
        if (err) {
          console.log('error while user register!', err);
          res.redirect("/");
        } else {
            console.log('user registered!');
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
        
      });
});

app.post("/login", function(req, res) {
    
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    const secret = new Secret ({
        content: req.body.secret
      });
    User.findById(req.user.id, function(err, foundUser){
        if(!err){
            if(foundUser){
                foundUser.secrets.push(secret);
                foundUser.save(function(){
                    console.log("Secret was saved!");
                    res.redirect("secrets");
                });
            }else{console.log("User was not found!"); res.redirect("/submit");}
        }else {console.log(err);}
    });
});


app.listen(3000, function() {
    console.log("Server has started successfully!");
  });