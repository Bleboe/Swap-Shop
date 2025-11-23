const app = require('./server');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Swap Shop Live: http://localhost:${PORT}`);
  console.log(`Images: http://localhost:${PORT}/uploads/ID/filename.jpg`);
});
