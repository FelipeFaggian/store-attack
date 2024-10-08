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
import NodeCache from 'node-cache';
// import { MercadoPagoConfig, Preference, Payment} from 'mercadopago';
import pkgMeli from 'mercadopago';
const { MercadoPagoConfig, Preference, Payment, Costumer, CustomerCard} = pkgMeli;
import { render } from "ejs";
import QRCode from 'qrcode';
import qr from 'qr-image';
import fs from 'fs';

//repeating the search for status payments....
// const intervalID = setInterval(myCallback, 5000);

// function myCallback() {
//   // Your code here
//   // Parameters are purely optional.
//   console.log("setInterval is searching something for each 5 seconds...");
// }

//trying drive the email to the cart page
let userEmail = null;        

//unversal var to init cache's recovery process
const myCache = new NodeCache();

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
    res.redirect("/logged");
    } else {

    res.render("home.ejs");
  }
});

//qrcode image block to the pix page
// app.post("/pix", async (req, res) => {
//   if (req.isAuthenticated()) { 
//     console.log("You are in pix.ejs file!"); 
//     console.log("Genereting qr code TEXT payment....");
//      // marcado pago get payment status by ID
//      const client = new MercadoPagoConfig({ accessToken: 'APP_USR-8205492202804430-042816-46f0a127eb6cd45626571eb4761a961b-830882078' });
//      const payment = new Payment(client);
 
//      // Step 4: Create the request object
//      console.log("body pix will be created! totalCart's value is: ", totalCart, " and userEmail's value is: ", userEmail);
//      const body = {
//        transaction_amount: totalCart,
//        description: 'Produto(s)',
//        payment_method_id: 'pix',
//        payer: {
//          email: userEmail
//        },
//      };
 
     // Step 5: Create request options object - Optional
     // const requestOptions = {
     //   idempotencyKey: '<IDEMPOTENCY_KEY>',
     // };
 
     // Step 6: Make the request
     // payment.create({ body, requestOptions }).then(console.log).catch(console.log);
    //  payment.create({ body }).then(console.log).catch(console.log);
//     let getQr = await payment.create({ body });
//     console.log("The  getQr['point_of_interaction']['transaction_data']['qr_code']'s value is: ", getQr['point_of_interaction']['transaction_data']['qr_code']);
//     let textQr = getQr['point_of_interaction']['transaction_data']['qr_code'];
//     // console.log("Generating qr code IMAGE payment...");
//     var qr_svg = qr.image(textQr, { type: 'svg' });
//     qr_svg.pipe(fs.createWriteStream('i_love_qr.svg'));
     
//     var svg_string = qr.imageSync(textQr, { type: 'svg' });
    
//     res.render("pix.ejs", { svg_string: svg_string, textQr: textQr});
//     } else {

//     res.render("home.ejs");
//   }
// });

// app.post("/process_payment", async (req, res) => {
//   if (req.isAuthenticated()) { 
//     console.log("You are in /process_payment Post block!");
//     const client = new MercadoPagoConfig({ accessToken: 'APP_USR-8205492202804430-042816-46f0a127eb6cd45626571eb4761a961b-830882078' });
//     const payment = new Payment(client);
//     payment.create({ body: req.body })
//     .then(console.log)
//     .catch(console.log);
//     res.render("formCard.ejs");
//     } else {

//     res.render("home.ejs");
//   }
// });

app.get("/secret", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
    } else {
    res.redirect('/login');
  }
});

// app.post("/formCard", (req, res) => {
//   if (req.isAuthenticated()) {
//      console.log("Entered inside /formCard post block! ");

//      res.render("formCard.ejs");
//     } else {
//     res.redirect('/login');
//   }
// });


app.get("/logged", (req, res) => {
  if (req.isAuthenticated()) {
    //  console.log("The userEmail value is: ", userEmail);
     res.render('logged.ejs', {userEmail: userEmail, item: item});
    } else {
    // console.log("sorry! you arent autheticated. back to login page...");
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

//universal var id preference refreshed after cart
let idPreference = null;
app.get("/checkout", (req, res) => {
  if (req.isAuthenticated()) {
    // console.log("Hello! You ar in checkout get block!");
    // console.log("xRequest's vlaue is: ", xRequest);
    // form this block the client can see your request solidified and be redirect to pix or card payment

    // console.log("The products the will be payied are: ", productsCart);
    // console.log("The totalCart is: ", totalCart);
    res.render("checkout.ejs", {productsCart: productsCart, idPreference: idPreference, totalCart: totalCart});
    } else {
    res.redirect('/login');
  }
});

app.post("/exitCart", (req, res) => {
  if (req.isAuthenticated()) {
    // console.log("We are inside de exitCart's post block!");

    res.redirect("/logged");
    } else {
    res.redirect('/login');
  }
});

app.post("/cartItems", async (req, res) => {
  if (req.isAuthenticated()) {
    // console.log("The POST BLOCK cartItems was activeted!!!");
    let buttonValue = req.body.submitButton;
    // console.log("The button's value selected was: ", buttonValue);
    // let getNumber = buttonValue.replace("save", "");
    // console.log("getNumber's value is: ",getNumber);
    // console.log("Collecting data to start process...");
    // console.log("The selected userEmail is: ", userEmail);
    let getEmail = userEmail;
    let getName = req.body.productName;
    let getDescription = req.body.productDescription;
    let getQuantity = req.body.productQuantity;
    let getPrice = req.body.productPrice;
    // console.log("The selected product's name is: ",getName.trim(), " the description is: ",getDescription.trim(), " the quantity is ", getQuantity, " and the e-mail of the cart's owner is: ", getEmail ," and the price is: ", getPrice);
    // Jconsole.log("Product selected to be updated: ", getName, "The input's quantity detected this value: ", getQuantity);
    if (req.body.submitButton == 'save') {
      // console.log("You entered inside if block of the save button!");
      if (getQuantity > 0) {
      // console.log("Starting update quantity's product process!");
      const newQuantity = await db.query("UPDATE cart SET productquantity = $1  WHERE productname = $2 AND clientemail = $3 AND productdescription = $4", 
        [getQuantity, getName.trim(), getEmail, getDescription.trim()]);
      // console.log("The value of the newQuantity is: ", newQuantity);
      // console.log("Starting process of possible duplicated cart products...");
      const possibleDuplicated = await db.query("SELECT * FROM cart WHERE productname = $1 AND clientemail = $2 AND productquantity = $3 AND productdescription = $4", 
        [getName.trim(), getEmail, getQuantity, getDescription.trim()]);
      // console.log("The possibleDuplicated var's length value is: ", possibleDuplicated.rows.length);
      if (possibleDuplicated.rows.length > 1) {
        const deleteDuplicated = await db.query("DELETE FROM cart WHERE productname = $1 AND clientemail = $2 AND productquantity = $3 AND productdescription = $4", 
          [getName.trim(), getEmail, getQuantity, getDescription.trim()]);
        // console.log("Duplicated products deleted! Check de lenght:  ", deleteDuplicated.rows.length);
        const insertIndividual = db.query(
          "INSERT INTO cart (productname, clientemail, productquantity, productdescription, productprice) VALUES ($1, $2, $3, $4, $5)",
          [getName.trim(), getEmail, getQuantity, getDescription.trim(), getPrice]
        );
        // console.log("The insertIndividual var's length value is: ", insertIndividual);
      }
    } else {
      // console.log("Invalid value to be updated!");
    } 
    }  if (req.body.submitButton == 'delete') {
      // console.log("You entered in else block of the delete button!");
      // console.log("Starting update quantity's product process!");
      const newQuantity = await db.query("UPDATE cart SET productquantity = $1  WHERE productname = $2 AND clientemail = $3 AND productdescription = $4 AND productquantity = $5", 
        [getQuantity, getName.trim(), userEmail.trim(), getDescription.trim(), getQuantity]);
      // console.log("The value of the newQuantity is: ", newQuantity);
      // console.log("Starting process of possible duplicated cart products...");
      const possibleDuplicated = await db.query("SELECT * FROM cart WHERE productname = $1 AND clientemail = $2 AND productquantity = $3 AND productdescription = $4", 
        [getName.trim(), userEmail.trim(), getQuantity, getDescription.trim()]);
      // console.log("The possibleDuplicated var's length value is: ", possibleDuplicated.rows.length);
      if (possibleDuplicated.rows.length > 1) {
        // console.log("INSIDE IF BLOCK STATMENT DUPLCATED");
        const deleteDuplicated = await db.query("DELETE FROM cart WHERE productname = $1 AND clientemail = $2 AND productquantity = $3 AND productdescription = $4", 
          [getName.trim(), userEmail.trim(), getQuantity, getDescription.trim()]);
        // console.log("Duplicated products deleted! Check de lenght:  ", deleteDuplicated.rows.length);
        const insertIndividual = await db.query(
          "INSERT INTO cart (productname, clientemail, productquantity, productdescription, productprice) VALUES ($1, $2, $3, $4, $5)",
          [getName.trim(), userEmail.trim(), getQuantity, getDescription.trim(), getPrice]
        );
        // console.log("The insertIndividual var's length value is: ", insertIndividual.rows.length);
      } else {
        // console.log("ELSE BLOCK STATMENT Starting delete process...");
        // const currrentCart = await db.query("SELECT * FROM cart");
        // console.log("The currentCart's value is: ", currrentCart);
        const result = await db.query("DELETE FROM cart WHERE productname = $1 AND clientemail = $2 AND productquantity = $3 AND productdescription = $4", 
          [getName.trim(), userEmail.trim(), getQuantity, getDescription.trim()]);
        // console.log("The result's value is: ", result, "the deletion is done!");
      }

    }
    res.redirect('/cart');
  }
  else {
    // console.log("Sorry! You arent authenticated!");
    res.redirect('/login');
  }
});


//universal var to stock client's cart
let totalCart = 0;
let productsCart = [];
// let xRequest = null;
//recovring the client's cart
app.get("/cart", async (req, res) => {
  //client identified
  if (req.isAuthenticated()) {
    // console.log("Hey! You are in GET BLOCK cart's page!");  
    const recoveryCart = await db.query(`SELECT * FROM cart WHERE clientemail = $1`,
      [userEmail]
    );
    //rendering cart's totalizator 
    totalCart = 0;
    // console.log("Starting for loop to get the total amount!");
    for (var i = 0; i < recoveryCart.rows.length; i++) {
      // console.log("Row ", i, " has the price: ", recoveryCart.rows[i]['productprice'], " and the quantity: ", recoveryCart.rows[i]['productquantity']);
      totalCart = totalCart + ( recoveryCart.rows[i]['productprice'] *  recoveryCart.rows[i]['productquantity']);
    }
    // console.log("We finish the for loop! Our totalCart is: ", totalCart);
    //rendering ckeckout's client
    // let idPreference = null;
    // console.log("We are starting the checkout's construction process. For while, the idPreference = ", idPreference);
    if (recoveryCart.rows.length > 0) {
    // console.log("The cart of the user ", userEmail, " was recovered: ", recoveryCart );
    const client = new MercadoPagoConfig({ accessToken: 'TEST-8205492202804430-042816-0c963d4089e0a19b82c6a03d5d0d71a3-830882078' });
    const preference = new Preference(client);
    let items = [
      // {
      //   title: 'Estopa de Polimento',
      //   quantity: 1,
      //   unit_price: 10
      // }
    ];
    //fill array items with carts's client products!
    items = [];
    // console.log("Starting loop to refresh the items obj!");
    for (var i = 0; i < recoveryCart.rows.length; i ++) {
      // console.log("A item was founded in client's cart! ");
      // console.log("The product founded's name is: ", recoveryCart.rows[i]['productname']);
      // console.log("The product founded's price is: ", recoveryCart.rows[i]['productprice']);
      // console.log("The product founded's quantity is: ", recoveryCart.rows[i]['productquantity']);
      // console.log("The dolar sign was getted out of the money's value: ", recoveryCart.rows[i]['productprice']);
      items.push({
        id: '00000',
        title: recoveryCart.rows[i]['productname'],
        quantity:  recoveryCart.rows[i]['productquantity'],
        unit_price: recoveryCart.rows[i]['productprice']
      });
      // console.log("The array items recevei a new filled position! Lets see: ", items);
    }
    //generating id preference by the items array
    // console.log("We finally get out from loop's scope. Lets see if we yet have our items's var: ", items);
    // console.log("FIRST LINE 1!"); 
    // items = [
    //   {
    //     id: '830882078-1c05a712-bdbf-4a47-adda-1fbf6e891a0c',
    //     title: 'Estopa de Polimento',
    //     quantity: 1,
    //     unit_price: 10
    //   }
    // ];
      const d = new Date();
      let today = d.toISOString();
      let tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString();
      const resultPreference = await preference.create({
          body: {
            binary_mode: true,
            operation_type: 'regular_payment',
            payment_methods: {
            excluded_payment_methods: [],
            excluded_payment_types: [],
            installments: 12,
            default_installments: 1
            },     
            items,
            back_urls: {
              "success": "http://localhost:3000/success",
              "failure": "http://localhost:3000/failed",
              "pending": "http://localhost:3000/pending"
            },
            auto_return: "approved",
            // expires: true,
            // expiration_date_from: today,
            // expiration_date_to: tomorrow,
            payer: {
            email: userEmail
            }
          }
        });

        // .then(console.log)
        // .catch(console.log);
        // console.log("SECOND LINE 2!"); 
        // console.log("resultPreference['id'] pleas? ", resultPreference['id']);
        // console.log("The resultPreference's value is: ", resultPreference);
        // xRequest = resultPreference['api_response']['headers']['x-request-id'];
        idPreference = resultPreference['id'];
        // const options = {
        //   offset: 0,
        //   limit: 2
        // };
        // const searchedOptions = await preference.search({ options });
        // console.log("The searchedOptions's value is: ", searchedOptions);
        // const searched = await preference.search({ resultPreference });
        // console.log( "CONST SEARCHED VLAUE: ", searched );
        // console.log("The seached value is: ", searched);
        // const idPreference = (searched['elements'][0]['id']);
        // console.log("The idPreference is: ", idPreference);
      } else {
        // "The render checkout was not consumed because the cart is empty!"
      }
    //rendering the products of client's cart...
    const result = await db.query(`SELECT * FROM cart WHERE clientemail = $1`,
      [userEmail]
    );
    // console.log("The recovered intire cart's database is: ", result);
    // console.log("Now, we need filter the rows to get the our client's products!");
    // console.log("Starting for loop with length equal to: ", result.rows.length);
    productsCart = [];
    let lengthCart = result.rows.length;
    // console.log("The lengthCart's value is: ", lengthCart);
    for (var i = 0; i < result.rows.length; i++) {
      if (result.rows[i]['clientemail'] == userEmail) {
        // console.log("The for loop find a user's product!");
        productsCart.push(result.rows[i]);
        // console.log("Product inserted in cart client's array: ", productsCart);
      } else {
        // console.log("The for loop didnt find any products to our client...");
      }
    }

    //test function to keypress event
    function keyPressed() {
      // console.log("Keypressed!");
    }
    // console.log("The FINAL array of the productsCart is: ", productsCart);
    //rendering the page...
    res.render("cart.ejs", {totalCart: totalCart ,keyPressed: keyPressed() ,lengthCart: lengthCart, idPreference: idPreference, productsCart: productsCart, userEmail: userEmail, nameView: nameView, descriptionView: descriptionView, priceView: priceView });
    } else {
    // console.log("Sorry! You arent authenticated!");
    res.redirect('/login');
  }
});

let idPayment = null;
app.get('/success', function (req, res) {
  idPayment =  req.query.payment_id;
  console.log("You are in success block get! the idPayment's value is: ", idPayment);
	res.json({
		Payment: req.query.payment_id,
		Status: req.query.status,
		MerchantOrder: req.query.merchant_order_id
	});
});

app.get('/pending', function (req, res) {
	res.redirect('/checkout');
});

app.get('/failed', function (req, res) {
	res.redirect('/checkout');
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

//user authenticated
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
  { id: 1, name: "Estopa Automotiva p/ Polimento", description: "4 Quilogramas" , url_img: 'img/estopa-carro.jpg', price: "5.00" },
  { id: 2, name: "Mini Kit Fusível Automotivo", description: "20 Kits" , url_img: 'img/mini-fusivel.jpg', price: "10.00" },
  { id: 3, name: "Parafusos Plásticos de 8mm", description: "2000 Unidades" , url_img: 'img/parafuso-plastico.jpg', price: "15.00" },
  { id: 4, name: "Palheta Automotiva", description: "600 Unidades" , url_img: 'img/palheta-automotiva.jpg', price: "39.99" },
  { id: 5, name: "Aditivos para Sistema de Arrefecimento", description: "720 Unidades" , url_img: 'img/sistema-arrefecimento.jpg', price: "49.99" },
  { id: 6, name: "Jogo de Tapete Automotivo Universal", description: "800 Unidades" , url_img: 'img/jogo-de-tapete-universal-automotivo.jpg', price: "59.99" },
  { id: 7, name: "Kit Vai Lavar 4 em 1 para Carros", description: "20 Kits" , url_img: 'img/kit-vai-lavar-4-em-1-para-carros-luxcar.jpg', price: "64.99" },
  { id: 8, name: "Kit de Lâmpadas H7 12V 55W Comum", description: "200 Unidades" , url_img: 'img/kit-10-lampadas-h7-12v-55w-comum-automotiva.jpg', price: "69.99" },
  { id: 9, name: "Suporte Veicular para Dispositivos", description: "20 unidades" , url_img: 'img/suporte-veicular.png', price: "74.99" },
];

//temporary vars
let nameView = null;
let descriptionView = null;
let priceView = null;
let imgView = null;
let idView = null;

//clicked button to be rendered!
app.post("/product", async (req, res) => {
//  console.log("Hey! You are on product Post's block!");
 let productId = req.body.productId;
//  console.log("The selected product's ID is: ", productId);
//  console.log("The values in product's array are: ", item);
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
  // console.log("The product clicked's name is: "+ nameView + " your description is: " + descriptionView + " and the price is: " + priceView +
  // " aaand your idView is: " + idView);
  
  // console.log('Hey! Lets try get your e-mail stocked in the browser cache data?');

  res.render('product.ejs', { 
    nameView: nameView, priceView: priceView, imgView: imgView, descriptionView: descriptionView
  });
    
  // console.log("Rendering the Page...");

  } else {
  res.redirect('/login');
}

});

app.post("/cart", async (req, res) => {
  if (req.isAuthenticated()) {
    //block identified
    // console.log("Hey! You are in cart's POST BLOCK!");
    let idCart = 0; 
    //inserting user with query sql on cart's client databse 
    // console.log("Inserting product on client's cart...");
    // console.log("The product's name added to client's cart is: ", nameView);
    const rowsCart = await db.query(`SELECT * FROM cart`);
    // console.log("rowsCart.rows.length is: ", rowsCart.rows.length);
    idCart = (rowsCart.rows.length + 1);
    // console.log("idCart's value to the new product insert in cart database is: ", idCart);
    await db.query(
      "INSERT INTO cart (clientemail, productname, productdescription, productprice, productquantity, idcart) VALUES ($1, $2, $3, $4, $5, $6)",
      [userEmail, nameView, descriptionView, priceView, 1, idCart]
    );
    // console.log("Product data added to client's cart in database!");
    // console.log("Recovering client's cart from database...");
    const result = await db.query(`SELECT * FROM cart`);
    // console.log("The recovered intire cart's database is: ", result);

    //rendering the page...
    res.redirect("/cart");
    } else {
    // console.log("Sorry! You arent authenticated!");
    res.redirect('/login');
  }
});

app.post("/register", async (req, res) => {
  // console.log("On register request POST block!");
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


//racional authetication process
passport.use(new LocalStrategy(
  async (username, password, done) => {

  // const email = req.body.username;
  // password = req.body.password;
  // console.log("The username typed is: ", username);
  // console.log("The password typed is: ", password);
  userEmail = username;
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username
    ]);
      // console.log("The result of username's search on database was: ", result.rows[0]);
      // console.log("Trying hashes veerify...");
      if (result.rows.length > 0) {
        let user = result.rows[0];
        const storedHashedPassword = user.password;
        // console.log("Testing hashes....");
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (err) {
            console.error("Error comparing passwords:", err);
          } else {
            if (result) {
              // console.log("Credientials founded! User can login...");
              // console.log("His E-MAIL is: ", username);

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

app.post("/login"
  //authenticatin process
  , passport.authenticate('local', {
  successRedirect: '/logged',
  failureRedirect: '/login',
  keepSessionInfo: true
  // failureFlash: true
  }) 
);


passport.serializeUser((user, done) => {
  // console.log("On seralizerUser Block!");
  // console.log("The user's value here is: ", user);
  // done(null, user.id);
  done(null, user.email);
  });

//  passport.deserializeUser(async (user, id, done) => {
  passport.deserializeUser(async (user, email, done) => {
  // console.log("On DeseralizerUser Block!");
  // console.log("The user's value here was getted!");
  user = user.find(u => u.email === email);
  done(null, user);
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

