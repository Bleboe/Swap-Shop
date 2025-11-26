// server/server.js
const express = require('express');

const session = require('express-session');

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

app.use(session({
  secret: 'swapshop-secret-key',
  resave: false,
  saveUninitialized: false
}));

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

//saves changes made to user.json
function saveUsers() {
  fs.writeFileSync(
    path.join(__dirname, 'users.json'),
    JSON.stringify(USERS, null, 2)
  );
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
    req.session.user = user;
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
  let filtered = items.filter(i => i.Approved === true);
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

  // Items the user donated
  const donated = items.filter(i => i.Donor === userEmail);

  // Items the user reserved/claimed
  const reserved = items.filter(i => i.ReservedBy === userEmail);

  // Items the user submitted that are pending admin approval
  const pending = items.filter(i => i.Donor === userEmail && i.Status === "pending");

  // Items the user donated that have been approved and are visible to others
  const approved = items.filter(i => i.Donor === userEmail && i.Status === "approved");

  res.render('myitems', {
    user,
    donated,
    reserved,
    pending,
    approved,
    currentPage: 'myitems'
  });
});


app.get('/admin', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);

  if (!user) return res.redirect('/');

  if (user.role !== 'admin') {
    return res.status(403).send("Access denied.");
  }

  const pending = items.filter(i => i.Approved === false);
  const approved = items.filter(i => i.Approved === true);

  res.render('admin', {
    user,
    pending,
    items,
    approved,
    currentPage: 'admin'
  });
});

//aprove an item
app.post('/admin/approve/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = items.find(i => i.ID === id);

  if (item) {
    item.Approved = true;
    item.Status = "Available";
    saveItems();
  }

  const userEmail = req.query.user || req.body.user;
  res.redirect(`/admin?user=${userEmail}`);
});

// Reject an item
app.post('/admin/delete/:id', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);

  if (!user || user.role !== 'admin') return res.redirect('/');

  const id = parseInt(req.params.id);
  items = items.filter(i => i.ID !== id);
  saveItems();

  res.redirect(`/admin?user=${encodeURIComponent(userEmail)}`);
});

app.get('/admin/reject/:id', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);

  if (!user || user.role !== 'admin') return res.redirect('/');

  const itemId = parseInt(req.params.id);
  const item = items.find(i => i.ID === itemId);

  if (!item) {
    return res.redirect(`/admin?user=${encodeURIComponent(userEmail)}`);
  }

  res.render('reject', {
    itemId,
    item,
    user,
    currentPage: 'admin'
  });
});

app.post('/admin/reject/:id', (req, res) => {
  const adminEmail = req.query.user;
  const adminUser = USERS.find(u => u.email === adminEmail);

  if (!adminUser || adminUser.role !== 'admin')
    return res.redirect('/');

  const id = parseInt(req.params.id);
  const reason = req.body.reason;

  const item = items.find(i => i.ID === id);
  const ownerEmail = item ? item.Donor : null;

  // Add notification to owner
  if (ownerEmail) {
    const owner = USERS.find(u => u.email === ownerEmail);

    if (owner) {
      if (!owner.notifications) owner.notifications = [];

      owner.notifications.push({
        id: Date.now(),
        type: "rejection",
        itemID: id,
        itemName: item.Title,
        message: reason,
        date: new Date().toISOString()
      });
    }
  }

  // Remove item
  items = items.filter(i => i.ID !== id);
  saveItems();

  // Delete image folder
  const folderPath = path.join(__dirname, 'uploads', String(id));
  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
  } catch (err) { }

  // SAVE USER CHANGES
  saveUsers();

  res.redirect(`/admin?user=${encodeURIComponent(adminEmail)}`);
});


app.get('/admin/item/:id', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);

  if (!user || user.role !== 'admin') return res.redirect('/');

  const itemId = parseInt(req.params.id);
  const item = items.find(i => i.ID === itemId);

  if (!item) return res.status(404).send("Item not found");

  res.render('item-details', {
    item,
    user,
    currentPage: 'admin',
    reviewMode: true
  });
});

app.get('/item/:id', (req, res) => {
  const item = items.find(i => i.ID === parseInt(req.params.id));
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);

  if (item && user) {
    res.render('item-details', {
      item,
      user,
      currentPage: '',
      reviewMode: false
    });
  } else {
    res.status(404).send('Not found');
  }
});


app.get('/notifications', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);
  if (!user) return res.redirect('/');

  res.render('notifications', {
    user,
    currentPage: 'notifications'
  });
});

app.get('/notification/:id', (req, res) => {
  const userEmail = req.query.user;
  const user = USERS.find(u => u.email === userEmail);

  if (!user) return res.redirect('/');

  const id = parseInt(req.params.id);
  const notification = user.notifications.find(n => n.id === id);

  if (!notification) return res.status(404).send("Notification not found");

  res.render("notification-details", {
    user,
    notification,
    currentPage: "notifications"
  });
});




// === LOGOUT ===
app.get('/logout', (req, res) => {
  res.redirect('/');
});

// === DONATE API: MOVE FILES FROM TEMP TO FINAL FOLDER ===
app.post('/api/donate', upload.array('photos', 5), (req, res) => {
  const { title, description, category, condition, donor } = req.body;

  // Validate required fields
  if (!title || !description || !category || !condition || !donor) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

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
    Status: 'Pending Aproval',
    Donor: donor,
    ReservedBy: null,
    Images: photos.join(','),
    ImageFolder: newId.toString(),

    Approved: false
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
