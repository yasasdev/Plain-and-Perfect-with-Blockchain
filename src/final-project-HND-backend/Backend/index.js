const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors"); // Cors provide access to the server from different domains

app.use(express.json());
app.use(cors());

// Connect connection with MongoDB
mongoose.connect("mongodb+srv://yasasDev:yasasDev123@cluster0.e6cs3fm.mongodb.net/e-commerce");

// API Creation

app.get("/", (req,res) => {
    res.send("Express App is Running")
})

// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({storage:storage})

// Creating upload endpoint for images 
app.use('/images', express.static(path.join('upload/images')));
app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for creating products
const Product = mongoose.model("Product", {
  id:{
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  new_price: {
    type: Number,
    required: true
  },
  old_price: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true
  }
})

app.post('/addproduct', async (req, res) => {
  let products = await Product.find({});
  let id;

  if(products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
    available: req.body.available
  });
  console.log(product);
  await product.save();
  console.log("Product added successfully");
  res.json({
    success: true,
    name: req.body.name,
    message: "Product added successfully"
  });
});

// Creating API for Deleting products
app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Product removed successfully");
  res.json({
    success: true,
    name: req.body.name,
    message: "Product removed successfully"
  });
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
  let products = await Product.find({});
  // console.log("All Products fetched successfully");
  res.send(products);
});

// Schema creating for user model
const Users = mongoose.model('Users',{
  name:{
    type: String,
    required: true
  },
  email:{
    type: String,
    Uinique: true,
    required: true
  },
  password:{
    type: String,
    required: true
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  }
})

// Creating Endpoint for user
app.post('/signup', async (req, res) => {
  let check = await Users.findOne({email: req.body.email});
  if(check) {
    return res.status(400).json({success: false, errors: "User already exists"});
  }
  let cart = {};
  for(let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart
  });
  await user.save();
  // console.log("User created successfully");

  const data = {
    user:{
      id: user.id,
    }
  }

  const token = jwt.sign(data,'sercret_ecom');
  res.json({success: true, token})

})

// Creatinf endpoint for user login
app.post('/login', async (req, res) => {
  let user = await Users.findOne({email: req.body.email});
  if(user) {
    const passCompare = req.body.password === user.password;
    if(passCompare) {
      const data = {
        user:{
          id: user.id,
        }
      }
      const token = jwt.sign(data,'sercret_ecom');
      res.json({success: true, token});
    } else {
      res.json({success: false, errors: "Sorry, your email or password is incorrect!"});
    }
  } else {
    res.json({success: false, errors: "Sorry, your email or password is incorrect!"});
  }
});

// Creating endpoint for New Collection data
app.get('/newcollections', async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  // console.log("New Collection fetched successfully");
  res.send(newcollection);
});

// Creating endpoint for Popular in Women section
app.get('/popularinwomen', async (req, res) => {
  let products = await Product.find({category:"women"});
  let popular_in_women = products.slice(0,4);
  // console.log("Popular in women fetched successfully");
  res.send(popular_in_women);
});

// Creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if(!token) {
    res.status(401).send({errors: "Please authenticate using a valid token"});
  } else {
    try {
      const data = jwt.verify(token, 'sercret_ecom');
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({errors: "Please authenticate using a valid token"});
    }
  }
}

// Creating endpoint for addidng products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
  console.log("Product added", req.body.itemId);
  // console.log(req.body, req.user);
  let userData = await Users.findOne({_id: req.user.id});
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
  res.send("Product added to cart successfully");
});

// Creating endpoint to remove product from CartData
app.post('/removefromcart', fetchUser, async (req, res) => {
  console.log("Product removed", req.body.itemId);
  let userData = await Users.findOne({_id: req.user.id});
  if(userData.cartData[req.body.itemId]>0){
    userData.cartData[req.body.itemId] -= 1;
  }  
  await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
  res.send("Product removed from the cart successfully");
});

// Creating endpoint to get cart data
app.post('/getcart', fetchUser, async (req, res) => {
  // console.log("Cart data fetched");
  let userData = await Users.findOne({_id: req.user.id});
  res.json(userData.cartData);
});

app.listen(port, (err) => {
  if (!err) {
    console.log(`Server running on port ${port}`);
  } else {
    console.error("Error starting server:", err);
  }
});