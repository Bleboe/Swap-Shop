// server/server.js
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// === SERVE UPLOADED IMAGES ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === TEMP UPLOAD DIR ===
const TEMP_DIR = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// === MULTER: Save to temp first ===
const upload = multer({
  dest: TEMP_DIR
});

// === CLEAN OLD TEMP FOLDERS ON STARTUP ===
if (fs.existsSync(TEMP_DIR)) {
  fs.readdirSync(TEMP_DIR).forEach(file => {
    const filePath = path.join(TEMP_DIR, file);
    try {
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Could not clean temp file: ${file}`);
    }
  });
}

// === DATA ===
let USERS = JSON.parse(fs.readFileSync('server/users.json'));
let items = [];
const EXCEL_FILE = 'server/items.xlsx';

function loadItems() {
  if (fs.existsSync(EXCEL_FILE)) {
    const workbook = XLSX.readFile(EXCEL_FILE);
    items = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    if (items.length === 0) {
      console.log('Excel file is empty: server/items.xlsx');
      console.log('Add sample data manually to Excel');
    } else {
      console.log(`Loaded ${items.length} item(s) from Excel`);
    }
  } else {
    items = [];
    saveItems();
    console.log('Created empty Excel file: server/items.xlsx');
    console.log('Add sample data manually to Excel');
  }
}

function saveItems() {
  const ws = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Items");
  XLSX.writeFile(wb, EXCEL_FILE);
}

loadItems();

// === AUTO-CREATE IMAGE FOLDERS FROM EXCEL ===
items.forEach(item => {
  const folder = path.join(__dirname, 'uploads', String(item.ImageFolder));
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`Created image folder: uploads/${item.ImageFolder}`);
  }
});

// === ROUTES ===
app.get('/', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email && u.password === password);
  if (user && email.endsWith('.edu')) {
    res.redirect(`/dashboard?user=${encodeURIComponent(email)}`);
  } else {
    // If request is from API (e.g., Supertest), return JSON and 401
    if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
      res.status(401).json({ error: 'Invalid .edu email or password' });
    } else {
      res.render('login', { error: 'Invalid .edu email or password' });
    }
  }
});

app.get('/dashboard', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);
  if (!user) return res.redirect('/');
  const category = req.query.category;
  let filtered = items;
  if (category) filtered = items.filter(i => i.Category === category);
  res.render('dashboard', { user, items: filtered, currentPage: 'dashboard', category });
});

app.get('/donate', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);
  if (!user) return res.redirect('/');
  res.render('donate', { user, currentPage: 'donate' });
});

app.get('/myitems', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);
  if (!user) return res.redirect('/');
  const donated = items.filter(i => i.Donor === userEmail);
  const reserved = items.filter(i => i.ReservedBy === userEmail);
  res.render('myitems', { user, donated, reserved, currentPage: 'myitems' });
});

app.get('/item/:id', (req, res) => {
  const item = items.find(i => i.ID === parseInt(req.params.id));
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);
  if (item && user) {
    res.render('item-details', { item, user, currentPage: '' });
  } else {
    res.status(404).send('Not found');
  }
});

// === LOGOUT ===
app.get('/logout', (req, res) => {
  res.redirect('/');
});

// === DONATE API: MOVE FILES FROM TEMP TO FINAL FOLDER ===
app.post('/api/donate', upload.array('photos', 5), (req, res) => {
  const { title, description, category, condition, donor } = req.body;

  const newId = Math.max(...items.map(i => i.ID), 0) + 1;
  const finalDir = path.join(__dirname, 'uploads', newId.toString());
  fs.mkdirSync(finalDir, { recursive: true });

  const photos = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const oldPath = file.path;
      const ext = path.extname(file.originalname) || '.jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 5);
      const newFilename = `photo-${timestamp}-${random}${ext}`;
      const newPath = path.join(finalDir, newFilename);
      try {
        fs.renameSync(oldPath, newPath);
        photos.push(newFilename);
      } catch (err) {
        console.error(`Failed to move file: ${oldPath} → ${newPath}`, err);
      }
    }
  } else {
    photos.push('default.jpg');
  }

  const newItem = {
    ID: newId,
    Title: title,
    Description: description,
    Category: category,
    Condition: condition,
    Status: 'Available',
    Donor: donor,
    ReservedBy: null,
    Images: photos.join(','),
    ImageFolder: newId.toString()
  };

  items.push(newItem);
  saveItems();
  res.json({ success: true, item: newItem });
});

app.post('/api/reserve', (req, res) => {
  const { id, user } = req.body;
  const item = items.find(i => i.ID === parseInt(id));
  if (item && item.Status === 'Available') {
    item.Status = 'Reserved';
    item.ReservedBy = user;
    saveItems();
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/update-status', (req, res) => {
  const { id, status, user } = req.body;
  const item = items.find(i => i.ID === parseInt(id));
  if (item && item.Donor === user) {
    if (status === 'Taken') item.Status = 'Taken';
    if (status === 'Available') { item.Status = 'Available'; item.ReservedBy = null; }
    saveItems();
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});


module.exports = app;