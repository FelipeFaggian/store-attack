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

import { MercadoPagoConfig, Preference } from 'mercadopago';

        const client = new MercadoPagoConfig({ accessToken: 'TEST-8205492202804430-042816-0c963d4089e0a19b82c6a03d5d0d71a3-830882078' });

        const preference = new Preference(client);

        const result = preference.create({
          body: {
            payment_methods: {
            excluded_payment_methods: [],
            excluded_payment_types: [],
            installments: 12
            },
            items: [
              {
                title: 'Estopa de Polimento',
                quantity: 1,
                unit_price: 10
              }
            ],
          }
        })
        .then(console.log)
        .catch(console.log);
      
        const searched = await preference.search({ result });
        const idPreference = (searched['elements'][0]['id']);
        console.log("THE KEYS'S OBJ ARE: ", idPreference);
      



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

app.get("/product", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("product.ejs");
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
    host: "smtp-mail.outlook.com",
    secureConnection: true,
    port: 578,
    // tls: {
    //   ciphers: 'starttls'
    // },
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
    // html: "<h2> Seu acesso foi liberado na plataforma de lojistas da Automultisom! </h2>  <form action='http://localhost:3000/login' method:'GET'> <button type='submit' "
    //  + "> <h1> Acessar </h1> </button>  </form>"
    html: "<h2> Seu acesso foi liberado na plataforma de lojistas da Automultisom! </h2>  <a href='http://localhost:3000/'><button><h3> Acessar </h3></button></a>"
  }

  transporter.sendMail(options1, (error, info) =>{
    if(error) console.log(error)
    else console.log(info)
  })
  console.log("Email of confirmation sended to waiting client!");
  res.render("bossConfirm.ejs");
});

//array product
let item = [
  { id: 1, name: "Estopa Automativa para Polimento", description: "x20 Pacotes (200g por Pacote)" , url_img: 'img/estopa-carro.jpg', price: "R$ 10,00" },
  { id: 2, name: "Mini Kit Fusível Automotivo", description: "20 Pacotes (1 Kit por Pacote)" , url_img: 'img/mini-fusivel.jpg', price: "R$ 20,00" },
  { id: 3, name: "Parafusos Plásticos de 8mm", description: "20 Pacotes (100 Unidades por Pacote)" , url_img: 'img/parafuso-plastico.jpg', price: "R$ 30,00" },
  { id: 4, name: "Palheta Automotiva", description: "20 Pacotes (30 Unidades por Pacote)" , url_img: 'img/palheta-automotiva.jpg', price: "R$ 40,00" },
  { id: 5, name: "Aditivos para Sistema de Arrefecimento", description: "20 Pacotes (12 Unidades por Pacote)" , url_img: 'img/sistema-arrefecimento.jpg', price: "R$ 50,00" },
  { id: 6, name: "Jogo de Tapete Automotivo Universal", description: "20 Pacotes (40 Unidades por Pacote)" , url_img: 'img/jogo-de-tapete-universal-automotivo.jpg', price: "R$ 60,00" },
  { id: 7, name: "Kit Vai Lavar 4 em 1 para Carros", description: "20 Pacotes (1 Kit por Pacote)" , url_img: 'img/kit-vai-lavar-4-em-1-para-carros-luxcar.jpg', price: "R$ 65,00" },
  { id: 8, name: "Kit de Lâmpadas H7 12V 55W Comum", description: "20 Pacotes (10 Unidades por Pacote)" , url_img: 'img/kit-10-lampadas-h7-12v-55w-comum-automotiva.jpg', price: "R$ 70,00" },
  { id: 9, name: "Suporte Veicular para Dispositivos", description: "20 Pacotes (1 Unidade por Pacote)" , url_img: 'img/suporte-veicular.png', price: "R$ 75,00" },
];

//recover products's data
// async function checkItem() {
//   const result = await pool.query(
//       `SELECT * FROM product ORDER BY id ASC;`
//       );
//   item = [];
//   result.rows.forEach((items) => {
//       item.push(items);
//   });
//   return item;
//   };

//temporary vars
let nameView = null;
let descriptionView = null;
let priceView = null;
let imgView = null;
let idView = null;
//clicked button to be rendered!
app.post("/product", async (req, res) => {
 console.log("Hey! You are on product Post's block!");
 let productId = req.body.productId;
 console.log("The selected product's ID is: ", productId);
 console.log("The values in product's array are: ", item);
  //  const item = await checkItem();
  for (var i = 0; i<item.length; i++) {
    if (item[i].id == productId) {
        nameView = item[i].name;
        descriptionView = item[i].description;
        priceView = item[i].price;
        imgView = item[i].url_img;
        idView = item[i].id;
    }
  };
//render the page
 if (req.isAuthenticated()) {
  console.log("The product clicked's name is: "+ nameView + " your description is: " + descriptionView + " and the price is: " + priceView +
  " aaand your idView is: " + idView);
  
  res.render('product.ejs', { 
    nameView: nameView, priceView: priceView, imgView: imgView, descriptionView: descriptionView
  });
    
  console.log("Rendering the Page...");

  } else {
  res.redirect('/login');
}

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
      res.send("Este e-mail já existe. Tente realizar o login.");
    } else {
      //first we need to send the register email request to the boss
      //Email API's shoot email request
      const transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        secureConnection: true,
        port: 443,
        // tls: {
        //   ciphers: 'starttls'
        //   },
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
        html: "<h2> O lojista com o email (" + email + "), contato (" + contact + ") e com CNPJ (" + cnpj + ")  está solicitando registro na plataforma! </h2>  <form action='http://localhost:3000/accepted' method:'GET'> <button type='submit' "
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

