# Video Link Extension for SillyTavern

A SillyTavern UI extension that adds a button to each chat message. When clicked, the button calls an external API endpoint and displays the returned URL as a clickable link within the message.

## Features

- 🔘 Adds a customizable button to every chat message
- 🔗 Fetches URLs from your custom API endpoint
- 📍 Displays returned links directly in the chat
- ⚙️ Configurable settings via the Extensions panel
- 🎨 Automatically adapts to SillyTavern themes

## Installation

### Via Git (Recommended)

1. Open SillyTavern and go to **Extensions** > **Download Extensions & Assets**
2. Paste this repository URL in the extension URL field:
   ```
   https://github.com/YOUR-USERNAME/st-message-link-button
   ```
3. Click **Download**
4. The extension will be installed automatically
5. Restart SillyTavern or reload the page

### Manual Installation from GitHub

1. Download or clone this repository
2. Navigate to your SillyTavern installation directory
3. Copy the entire folder to one of these locations:
   - **For current user only**: `data/<your-user>/extensions/st-video-link/`
   - **For all users**: `public/scripts/extensions/third-party/st-video-link/`
4. Restart SillyTavern or reload the page

### Direct Git Clone

**For current user:**
```bash
cd /path/to/SillyTavern/data/<your-user>/extensions/
git clone https://github.com/Hsaka/SIllyTavern-Video-Link.git
```

**For all users:**
```bash
cd /path/to/SillyTavern/public/scripts/extensions/third-party/
git clone https://github.com/Hsaka/SIllyTavern-Video-Link.git
```

## Configuration

1. Open SillyTavern
2. Go to **Extensions** > **Manage Extensions**
3. Scroll down to find **Message Link Button Settings**
4. Configure the following options:

   - **Enable Extension**: Toggle the extension on/off
   - **API Endpoint**: Set your API endpoint URL (default: `https://api.example.com/get-link`)
   - **Button Text**: Customize the button display text or emoji (default: 🔗)
   - **Button Position**: Choose whether buttons appear on the left or right side of messages

## API Requirements

Your API endpoint should:

- Accept POST requests
- Receive JSON data with the following structure:
  ```json
  {
    "message": "The full text content of the message",
    "timestamp": 1234567890
  }
  ```
- Return a JSON response with a URL:
  ```json
  {
    "url": "https://example.com/your-link"
  }
  ```

### Example API Response Formats

The extension supports multiple response formats:

```json
// Format 1
{ "url": "https://example.com/link" }

// Format 2
{ "link": "https://example.com/link" }

// Format 3 (direct string)
"https://example.com/link"
```

### Example API Implementation (Node.js/Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/get-link', (req, res) => {
  const { message, timestamp } = req.body;
  
  // Your logic to generate/fetch a URL based on the message
  const generatedUrl = `https://example.com/message/${Date.now()}`;
  
  res.json({ url: generatedUrl });
});

app.listen(3000, () => {
  console.log('API running on port 3000');
});
```

## Usage

1. Start a conversation in SillyTavern
2. You'll see a 🔗 button (or your custom button text) on each message
3. Click the button to trigger the API call
4. The button will show a loading state (⏳) while fetching
5. Once complete, the URL will appear as a clickable link below the message
6. The button will show a success checkmark (✓) and then hide itself

### Button States

- **🔗** - Default state (ready to click)
- **⏳** - Loading (API call in progress)
- **✓** - Success (link added, button will hide soon)
- **✗** - Error (API call failed, button will reset after 2 seconds)

## Troubleshooting

### The button doesn't appear

- Check that the extension is enabled in the Manage Extensions menu
- Make sure all three files (manifest.json, index.js, style.css) are in the correct folder
- Check the browser console for any error messages
- Try disabling and re-enabling the extension

### API calls are failing

- Verify your API endpoint URL is correct in the settings
- Check that your API is running and accessible
- Look at the browser console for detailed error messages
- Ensure your API returns the correct response format
- Check for CORS issues if your API is on a different domain

### CORS Issues

If you're getting CORS errors, your API needs to include appropriate headers:

```javascript
// Add these headers to your API responses
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type');
```

## Customization

### Changing Button Appearance

Edit `style.css` to customize the button's look:

```css
.message-link-button {
    /* Customize colors, padding, etc. */
    background-color: #your-color;
    border: 1px solid #your-border-color;
}
```

### Modifying API Request Format

Edit the `fetchLinkFromAPI` function in `index.js` to change what data is sent to your API:

```javascript
body: JSON.stringify({
    message: messageText,
    timestamp: Date.now(),
    // Add your custom fields here
})
```

## Version History

### 1.0.0
- Initial release
- Basic button functionality
- API integration
- Settings UI
- Theme support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/YOUR-USERNAME/st-message-link-button/issues)
- **Discord**: Join the [SillyTavern Discord](https://discord.gg/sillytavern) for community support
- **Documentation**: Check the [SillyTavern Docs](https://docs.sillytavern.app/)

## Credits

Created for the SillyTavern community.

Built following the [SillyTavern Extension Guidelines](https://docs.sillytavern.app/for-contributors/writing-extensions/).