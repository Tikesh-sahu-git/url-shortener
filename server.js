// Import required modules
const express = require('express');          // Web framework for Node.js
const bodyParser = require('body-parser');  // Middleware to parse form data
const sqlite3 = require('sqlite3').verbose(); // SQLite3 database library (with verbose logging)
const shortid = require('shortid');         // Library to generate unique short codes
const path = require('path');               // Module to work with file/directory paths

// Initialize Express app
const app = express();

// Connect or create SQLite database named 'urls.db'
const db = new sqlite3.Database('./urls.db');

// Create the 'urls' table if it doesn't already exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique ID (auto-incremented)
      short_code TEXT UNIQUE,                -- Shortened code (unique)
      original_url TEXT,                     -- The full original URL
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Timestamp of entry
    )
  `);
});

// Middleware to parse URL-encoded form data from POST requests
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Set the directory for EJS view templates
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory (CSS, JS, etc.)
app.use(express.static('public'));

// Route: GET /
// Renders the homepage (form to input long URL)
app.get('/', (req, res) => {
  res.render('index'); // Render 'views/index.ejs'
});

// Route: POST /shorten
// Receives long URL, generates short code, saves to DB, and renders result
app.post('/shorten', (req, res) => {
  const originalUrl = req.body.originalUrl;       // Get long URL from form input
  const shortCode = shortid.generate();           // Generate a unique short code

  // Insert the short code and original URL into the database
  db.run(
    'INSERT INTO urls (short_code, original_url) VALUES (?, ?)',
    [shortCode, originalUrl],
    function(err) {
      if (err) {
        // If insertion fails (e.g., duplicate), send a 500 response
        return res.status(500).json({ error: 'Database error' });
      }

      // Construct the full short URL using request protocol and host
      const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;

      // Render the result page, passing both short and original URLs
      res.render('result', { shortUrl, originalUrl }); // Render 'views/result.ejs'
    }
  );
});

// Route: GET /:shortCode
// Handles redirection when user visits a shortened URL
app.get('/:shortCode', (req, res) => {
  const shortCode = req.params.shortCode; // Get the short code from URL

  // Look up the original URL from the database using the short code
  db.get(
    'SELECT original_url FROM urls WHERE short_code = ?',
    [shortCode],
    (err, row) => {
      if (err || !row) {
        // If not found or error, return 404 response
        return res.status(404).send('URL not found');
      }

      // Redirect user to the original long URL
      res.redirect(row.original_url);
    }
  );
});

// Start the Express server on port 3000 (or environment-defined port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
