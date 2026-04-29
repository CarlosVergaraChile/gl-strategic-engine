const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

// Fallback to portal.html or index.html if you prefer
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'portal.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
