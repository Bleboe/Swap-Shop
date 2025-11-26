# Swap Shop – Campus Reuse Platform

A **secure, local web app** for students & faculty to **donate, reserve, and reuse** items.

---

## Features

- Login with college email
- Donate items with **photos**
- Reserve items
- My Items: **Donated** & **Reserved** in 2 columns
- Purple header + **profile icon → logout**
- Fully offline (after first run)
- Data stored in **Excel** (`items.xlsx`)
- Images in `uploads/ID/`

---

## How to Run on Any Computer

### 1. **Prerequisites**
- **Node.js** (v18 or higher)
- **Excel** (to edit `items.xlsx`)

## Tools & Technologies Used

## Tool            Purpose
- Node.js         Backend server
- Express.js      Web framework
- EJS             HTML templating
- MulterFile      upload handling
- XLSX            (SheetJS)Read/write Excel files
- HTML/CSS/JS     Frontend

### 2. **Unzip & Setup**
```bash
download swap-shop.zip
unzip swap-shop.zip
cd swap-shop
npm install //installs the required Tools and Packages using the json file 
node server/index.js
```
---

### Testing

Jest is popular all-in-one testing framework for Node.js, with the help of supertest it allows for easy and fast testing
it can be run using 'npm test (file location)'



