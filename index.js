import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import passport from "passport";
import pkg from "passport-local";
import session from "express-session";
import cookieParser from "cookie-parser";
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import postgres from "postgres";
import { neon } from '@neondatabase/serverless';
import nn from "pg";
import EventEmitter from 'node:events';

const eventEmitter = new EventEmitter();
const { Pool } = nn;

dotenv.config()

const LocalStrategy = pkg.Strategy;
const app = express();
const port = 3000;
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(cookieParser());

// Use session middleware
app.use(session({
secret: 'TOPSECRET',
resave: false,
saveUninitialized: true,
cookie: { maxAge: (10 * 60 * 1000) }	// 10 minutes
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

//init detabase neom
const db = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
async function getData() {
  const pool = await db.connect();
  try {
    const response = await db.query('SELECT version()');
    console.log(response.rows[0]);
    return response.rows[0];
  } finally {
    pool.release();
  }
}
//yup database neom working...
getData();

//gateways
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
    } else {
    res.render("home.ejs");
  }
});

app.get("/secret", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
    } else {
    res.redirect('/login');
  }
});

app.get("/logged", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("logged.ejs");
    } else {
    res.redirect('/login');
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/logout", (req, res) => {
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/accepted", async (req, res) => {
  console.log("You are on block to accepted register!");
  //recover last email from request table database
  const result = await db.query("SELECT * FROM requests");
  const lastUser =  (result.rows.length - 1);
  const email = result.rows[lastUser].email;
  const password = result.rows[lastUser].password;
  console.log("The recovery email from requests value is: ", email);
  console.log("The recovery password from requests value is: ", password);
  db.query(
    "INSERT INTO users (email, password) VALUES ($1, $2)",
    [email, password]
  );
  console.log("User inserted on table users accepted database!");

  const transporter = nodemailer.createTransport({
    service : process.env.EMAIL_SERVICE,
    auth : {
        user : process.env.EMAIL_USERNAME,
        pass : process.env.EMAIL_PASSWORD
    }
   })

  const options1 = {
    from : process.env.EMAIL_SENDER, 
    to: email, 
    subject: "Seu Registro foi Aprovado!", 
    html: "<h2> Seu acesso foi liberado na plataforma de lojistas da Automultisom! </h2>  <form action='http://localhost:3000/' method:'GET'> <button type='submit' "
     + "> <h1> Acessar </h1> </button>  </form>"
  }

  transporter.sendMail(options1, (error, info) =>{
    if(error) console.log(error)
    else console.log(info)
  })
  console.log("Email of confirmation sended to waiting client!");
  res.render("bossConfirm.ejs");
});

app.post("/register", async (req, res) => {
  console.log("On register request POST block!");
  const email = req.body.username;
  const contact = req.body.contact;
  const cnpj = req.body.cnpj;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      //first we need to send the register email request to the boss
      //Email API's shoot email request
      const transporter = nodemailer.createTransport({
        service : process.env.EMAIL_SERVICE,
        auth : {
            user : process.env.EMAIL_USERNAME,
            pass : process.env.EMAIL_PASSWORD
        }
       })

       const options = {
        from : process.env.EMAIL_SENDER, 
        to: "felipesantosfaggian@gmail.com", 
        subject: "Requisição de Registro na Plataforma para Lojistas", 
        text: "O lojista com o email (" + email + "), contato (" + contact + ") e com CNPJ (" + cnpj + ")  está solicitando registro na plataforma!", 
        html: "<h2> O lojista com o email (" + email + "), contato (" + contact + ") e com CNPJ (" + cnpj + ")  está solicitando registro na plataforma! </h2>  <form action='http://localhost:3000/accepted' method:'POST'> <button type='submit' "
         + "> <h1> AUTORIZAR ACESSO </h1> </button>  </form>"
    }

    transporter.sendMail(options, (error, info) =>{
      if(error) console.log(error)
      else console.log(info)
    })

      //hashing the password and saving it in the database
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            console.log("Hashed Password:", hash);
            await db.query(
              "INSERT INTO requests (email, password) VALUES ($1, $2)",
              [email, hash]
            );
            console.log("User inserted on requests table database!");
            res.render("secrets.ejs");
          }
      });
    }
  } catch (err) {
    console.log(err);
  }
});



passport.use(new LocalStrategy(
  async (username, password, done) => {
  
  // const email = req.body.username;
  // password = req.body.password;
  console.log("The username typed is: ", username);
  console.log("The password typed is: ", password);
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username
    ]);
      console.log("The result of username's search on database was: ", result.rows[0]);
      console.log("Trying hashes veerify...");
      if (result.rows.length > 0) {
        let user = result.rows[0];
        const storedHashedPassword = user.password;
        console.log("Testing hashes....");
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (err) {
            console.error("Error comparing passwords:", err);
          } else {
            if (result) {
              console.log("Credientials founded! User can login...");
              return done(null, user);
            } else {
              return done(null, false, { message: 'Incorrect password.' });
            }
          }
        });
      } else {
        console.log("Verify process of hashes failed!");
        return done(null, false);
      }
    } catch (err) {
      console.log(err);
    }
  }
));

app.post("/login", passport.authenticate('local', {
  successRedirect: '/logged',
  failureRedirect: '/login',
  keepSessionInfo: true
  // failureFlash: true
  }) 
);

passport.serializeUser((user, done) => {
  console.log("On seralizerUser Block!");
  console.log("The user's value here is: ", user);
  // done(null, user.id);
  done(null, user.email);
  });

//  passport.deserializeUser(async (user, id, done) => {
  passport.deserializeUser(async (user, email, done) => {
  console.log("On DeseralizerUser Block!");
  console.log("The user's value here was getted!");
  user = user.find(u => u.email === email);
  done(null, user);
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

