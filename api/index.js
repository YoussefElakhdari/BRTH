const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Booking = require('./models/Booking.js');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const fs = require('fs');
const mime = require('mime-types');

require('dotenv').config();
const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'fasefraw4r5r3wq45wdfgw34twdfg';
const bucket = 'booking-app';

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cors({
  credentials: true,
  origin: 'http://localhost:5173',
}));

async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb://0.0.0.0:27017', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

connectToDatabase();

async function uploadToS3(path, originalFilename, mimetype) {
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'djfDSFeé&é33',
      secretAccessKey: 'hjjehcrhe21é"é("-)',
    },
  });
  const parts = originalFilename.split('.');
  const ext = parts[parts.length - 1];
  const newFilename = Date.now() + '.' + ext;

  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Body: fs.readFileSync(path),
      Key: newFilename,
      ContentType: mimetype,
      ACL: 'public-read',
    }));
    return `https://${bucket}.s3.amazonaws.com/${newFilename}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}

function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, (err, userData) => {
      if (err) return reject(err);
      resolve(userData);
    });
  });
}

app.get('/api/test', (req, res) => {
  res.json('test ok');
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Basic input validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const userDoc = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json(userDoc);
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userDoc = await User.findOne({ email });
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (!passOk) {
      return res.status(422).json({ error: 'Invalid password' });
    }

    jwt.sign({
      email: userDoc.email,
      id: userDoc._id,
    }, jwtSecret, {}, (err, token) => {
      if (err) {
        console.error('JWT sign error:', err);
        return res.status(500).json({ error: 'Login failed. Please try again later.' });
      }
      res.cookie('token', token).json(userDoc);
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
});

app.get('/api/profile', async (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userData = await getUserDataFromReq(req);
    const { name, email, _id } = await User.findById(userData.id);
    res.json({ name, email, _id });
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ error: 'Could not fetch profile. Please try again later.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.cookie('token', '').json(true);
});

app.post('/api/upload-by-link', async (req, res) => {
  const { link } = req.body;
  const newName = 'photo' + Date.now() + '.jpg';

  try {
    await imageDownloader.image({
      url: link,
      dest: '/tmp/' + newName,
    });

    const url = await uploadToS3('/tmp/' + newName, newName, mime.lookup('/tmp/' + newName));
    res.json(url);
  } catch (e) {
    console.error('Upload by link error:', e);
    res.status(500).json({ error: 'Upload failed. Please try again later.' });
  }
});

const photosMiddleware = multer({ dest: '/tmp' });
app.post('/api/upload', photosMiddleware.array('photos', 100), async (req, res) => {
  const uploadedFiles = [];

  try {
    for (let i = 0; i < req.files.length; i++) {
      const { path, originalname, mimetype } = req.files[i];
      const url = await uploadToS3(path, originalname, mimetype);
      uploadedFiles.push(url);
    }
    res.json(uploadedFiles);
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Upload failed. Please try again later.' });
  }
});

app.post('/api/places', async (req, res) => {
  const { token } = req.cookies;
  const {
    title, address, addedPhotos, description, price,
    perks, extraInfo, checkIn, checkOut, maxGuests,
  } = req.body;

  try {
    const userData = await getUserDataFromReq(req);
    const placeDoc = await Place.create({
      owner: userData.id, price,
      title, address, photos: addedPhotos, description,
      perks, extraInfo, checkIn, checkOut, maxGuests,
    });
    res.json(placeDoc);
  } catch (e) {
    console.error('Place creation error:', e);
    res.status(500).json({ error: 'Could not create place. Please try again later.' });
  }
});

app.get('/api/user-places', async (req, res) => {
  const { token } = req.cookies;

  try {
    const userData = await getUserDataFromReq(req);
    const places = await Place.find({ owner: userData.id });
    res.json(places);
  } catch (e) {
    console.error('Fetch user places error:', e);
    res.status(500).json({ error: 'Could not fetch places. Please try again later.' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const place = await Place.findById(id);
    res.json(place);
  } catch (e) {
    console.error('Fetch place error:', e);
    res.status(500).json({ error: 'Could not fetch place. Please try again later.' });
  }
});

app.put('/api/places', async (req, res) => {
  const { token } = req.cookies;
  const {
    id, title, address, addedPhotos, description,
    perks, extraInfo, checkIn, checkOut, maxGuests, price,
  } = req.body;

  try {
    const userData = await getUserDataFromReq(req);
    const placeDoc = await Place.findById(id);

    if (userData.id !== placeDoc.owner.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    placeDoc.set({
      title, address, photos: addedPhotos, description,
      perks, extraInfo, checkIn, checkOut, maxGuests, price,
    });
    await placeDoc.save();
    res.json('ok');
  } catch (e) {
    console.error('Update place error:', e);
    res.status(500).json({ error: 'Could not update place. Please try again later.' });
  }
});

app.get('/api/places', async (req, res) => {
  try {
    const places = await Place.find();
    res.json(places);
  } catch (e) {
    console.error('Fetch places error:', e);
    res.status(500).json({ error: 'Could not fetch places. Please try again later.' });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { place, checkIn, checkOut, numberOfGuests, name, phone, price } = req.body;

  try {
    const userData = await getUserDataFromReq(req);
    const bookingDoc = await Booking.create({
      place, checkIn, checkOut, numberOfGuests, name, phone, price,
      user: userData.id,
    });
    res.json(bookingDoc);
  } catch (e) {
    console.error('Booking creation error:', e);
    res.status(500).json({ error: 'Could not create booking. Please try again later.' });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);
    const bookings = await Booking.find({ user: userData.id }).populate('place');
    res.json(bookings);
  } catch (e) {
    console.error('Fetch bookings error:', e);
    res.status(500).json({ error: 'Could not fetch bookings. Please try again later.' });
  }
});

app.listen(4000, () => {
  console.log('Server is running on port 4000');

});
