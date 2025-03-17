![Demo](https://github.com/user-attachments/assets/ad6db606-ae3a-48db-a1cc-e1f88847769e)

# Replicate Flux MCP

![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue)
![Model Context Protocol](https://img.shields.io/badge/MCP-Enabled-purple)
[![smithery badge](https://smithery.ai/badge/@awkoy/replicate-flux-mcp)](https://smithery.ai/server/@awkoy/replicate-flux-mcp)
![NPM Downloads](https://img.shields.io/npm/dw/replicate-flux-mcp)
![Stars](https://img.shields.io/github/stars/awkoy/replicate-flux-mcp)

<a href="https://glama.ai/mcp/servers/ss8n1knen8">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/ss8n1knen8/badge" />
</a>

**Replicate Flux MCP** is an advanced Model Context Protocol (MCP) server that empowers AI assistants to generate high-quality images and vector graphics. Leveraging [Black Forest Labs' Flux Schnell model](https://replicate.com/black-forest-labs/flux-schnell) for raster images and [Recraft's V3 SVG model](https://replicate.com/recraft-ai/recraft-v3-svg) for vector graphics via the Replicate API.

## 📑 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Getting Started](#-getting-started)
- [Documentation](#-documentation)
  - [Available Tools](#available-tools)
  - [Available Resources](#available-resources)
- [Integration](#-integration)
  - [Cursor](#cursor-integration)
  - [Claude Desktop](#claude-desktop-integration)
  - [Smithery](#smithery-integration)
- [Development](#-development)
- [Technical Details](#-technical-details)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)
- [Resources](#-resources)

## 🌟 Features

- **🖼️ High-Quality Image Generation** - Create stunning images using Flux Schnell, a state-of-the-art AI model
- **🎨 Vector Graphics Support** - Generate professional SVG vector graphics with Recraft V3 SVG model
- **🤖 AI Assistant Integration** - Seamlessly enable AI assistants like Claude to generate visual content
- **🎛️ Advanced Customization** - Fine-tune generation with controls for aspect ratio, quality, resolution, and more
- **🔌 Universal MCP Compatibility** - Works with all MCP clients including Cursor, Claude Desktop, Cline, and Zed
- **🔒 Secure Local Processing** - All requests are processed locally for enhanced privacy and security
- **🔍 Comprehensive History Management** - Track, view, and retrieve your complete generation history
- **📊 Batch Processing** - Generate multiple images from different prompts in a single request
- **🔄 Variant Exploration** - Create and compare multiple interpretations of the same concept
- **✏️ Prompt Engineering** - Fine-tune image variations with specialized prompt modifications

## 📦 Installation

### NPM Global Installation

```bash
npm install -g replicate-flux-mcp
```

### Direct Usage with NPX

```bash
REPLICATE_API_TOKEN=your_token npx -y replicate-flux-mcp
```

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/replicate-flux-mcp.git
cd replicate-flux-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## 🚀 Getting Started

1. **Obtain a Replicate API Token**
   - Sign up at [Replicate](https://replicate.com/)
   - Create an API token in your account settings

2. **Install the MCP Server**
   - Follow the installation instructions above

3. **Configure Your MCP Client**
   - Set up your preferred MCP client (Cursor, Claude Desktop, etc.)
   - Add your Replicate API token to the configuration

4. **Generate Your First Image**
   - Use the `generate_image` tool with a descriptive prompt
   - Example: `"A serene mountain landscape at sunset with reflections in a lake"`

5. **Explore Advanced Features**
   - Try different parameter settings for customized results
   - Experiment with SVG generation using `generate_svg`
   - Use batch image generation with `generate_multiple_images` for creating variations on a theme
     - Example: `{ "prompts": ["A red sports car on a mountain road", "A blue sports car on a beach", "A vintage sports car in a city street"] }`
   - Generate multiple design variants with `generate_image_variants` to explore different interpretations of the same prompt
     - Using seeds: `{ "prompt": "A futuristic city skyline at night", "num_variants": 4, "seed": 42 }`
     - Using prompt variations: `{ "prompt": "A character portrait", "prompt_variations": ["in anime style", "in watercolor style", "in oil painting style", "as a 3D render"] }`

## 📚 Documentation

### Available Tools

#### `generate_image`

Generates an image based on a text prompt using the Flux Schnell model.

```typescript
{
  prompt: string;                // Required: Text description of the image to generate
  seed?: number;                 // Optional: Random seed for reproducible generation
  go_fast?: boolean;             // Optional: Run faster predictions with optimized model (default: true)
  megapixels?: "1" | "0.25";     // Optional: Image resolution (default: "1")
  num_outputs?: number;          // Optional: Number of images to generate (1-4) (default: 1)
  aspect_ratio?: string;         // Optional: Aspect ratio (e.g., "16:9", "4:3") (default: "1:1")
  output_format?: string;        // Optional: Output format ("webp", "jpg", "png") (default: "webp")
  output_quality?: number;       // Optional: Image quality (0-100) (default: 80)
  num_inference_steps?: number;  // Optional: Number of denoising steps (1-4) (default: 4)
  disable_safety_checker?: boolean; // Optional: Disable safety filter (default: false)
}
```

#### `generate_multiple_images`

Generates multiple images based on an array of prompts using the Flux Schnell model.

```typescript
{
  prompts: string[];             // Required: Array of text descriptions for images to generate (1-10 prompts)
  seed?: number;                 // Optional: Random seed for reproducible generation
  go_fast?: boolean;             // Optional: Run faster predictions with optimized model (default: true)
  megapixels?: "1" | "0.25";     // Optional: Image resolution (default: "1")
  aspect_ratio?: string;         // Optional: Aspect ratio (e.g., "16:9", "4:3") (default: "1:1")
  output_format?: string;        // Optional: Output format ("webp", "jpg", "png") (default: "webp")
  output_quality?: number;       // Optional: Image quality (0-100) (default: 80)
  num_inference_steps?: number;  // Optional: Number of denoising steps (1-4) (default: 4)
  disable_safety_checker?: boolean; // Optional: Disable safety filter (default: false)
}
```

#### `generate_image_variants`

Generates multiple variants of the same image from a single prompt.

```typescript
{
  prompt: string;                // Required: Text description for the image to generate variants of
  num_variants: number;          // Required: Number of image variants to generate (2-10, default: 4)
  prompt_variations?: string[];  // Optional: List of prompt modifiers to apply to variants (e.g., ["in watercolor style", "in oil painting style"])
  variation_mode?: "append" | "replace"; // Optional: How to apply variations - 'append' adds to base prompt, 'replace' uses variations directly (default: "append")
  seed?: number;                 // Optional: Base random seed. Each variant will use seed+variant_index
  go_fast?: boolean;             // Optional: Run faster predictions with optimized model (default: true)
  megapixels?: "1" | "0.25";     // Optional: Image resolution (default: "1")
  aspect_ratio?: string;         // Optional: Aspect ratio (e.g., "16:9", "4:3") (default: "1:1")
  output_format?: string;        // Optional: Output format ("webp", "jpg", "png") (default: "webp")
  output_quality?: number;       // Optional: Image quality (0-100) (default: 80)
  num_inference_steps?: number;  // Optional: Number of denoising steps (1-4) (default: 4)
  disable_safety_checker?: boolean; // Optional: Disable safety filter (default: false)
}
```

#### `generate_svg`

Generates an SVG vector image based on a text prompt using the Recraft V3 SVG model.

```typescript
{
  prompt: string;                // Required: Text description of the SVG to generate
  size?: string;                 // Optional: Size of the generated SVG (default: "1024x1024")
  style?: string;                // Optional: Style of the generated image (default: "any")
                                // Options: "any", "engraving", "line_art", "line_circuit", "linocut"
}
```

#### `prediction_list`

Retrieves a list of your recent predictions from Replicate.

```typescript
{
  limit?: number;  // Optional: Maximum number of predictions to return (1-100) (default: 50)
}
```

#### `get_prediction`

Gets detailed information about a specific prediction.

```typescript
{
  predictionId: string;  // Required: ID of the prediction to retrieve
}
```

### Available Resources

#### `imagelist`

Browse your history of generated images created with the Flux Schnell model.

#### `svglist`

Browse your history of generated SVG images created with the Recraft V3 SVG model.

#### `predictionlist`

Browse all your Replicate predictions history.

## 🔧 Integration

### Cursor Integration

#### Method 1: Using mcp.json

1. Create or edit the `.cursor/mcp.json` file in your project directory:

```json
{
  "mcpServers": {
    "replicate-flux-mcp": {
      "command": "env REPLICATE_API_TOKEN=YOUR_TOKEN npx",
      "args": ["-y", "replicate-flux-mcp"]
    }
  }
}
```

2. Replace `YOUR_TOKEN` with your actual Replicate API token
3. Restart Cursor to apply the changes

#### Method 2: Using Cursor MCP Settings

1. Open Cursor and go to Settings
2. Navigate to the "MCP" or "Model Context Protocol" section
3. Click "Add Server" or equivalent
4. Enter the following command in the appropriate field:

```
env REPLICATE_API_TOKEN=YOUR_TOKEN npx -y replicate-flux-mcp
```

5. Replace `YOUR_TOKEN` with your actual Replicate API token
6. Save the settings and restart Cursor if necessary

### Claude Desktop Integration

```json
{
  "mcpServers": {
    "replicate-flux-mcp": {
      "command": "npx",
      "args": ["-y", "replicate-flux-mcp"],
      "env": {
        "REPLICATE_API_TOKEN": "YOUR TOKEN"
      }
    }
  }
}
```

### Smithery Integration

This MCP server is available as a hosted service on Smithery, allowing you to use it without setting up your own server.

1. Visit [Smithery](https://smithery.ai/) and create an account if you don't have one
2. Navigate to the [Replicate Flux MCP server page](https://smithery.ai/server/@awkoy/replicate-flux-mcp)
3. Click "Add to Workspace" to add the server to your Smithery workspace
4. Configure your MCP client (Cursor, Claude Desktop, etc.) to use your Smithery workspace URL

Benefits of using the Smithery-hosted version:
- No local setup required
- Always running the latest version
- Managed infrastructure and reliability
- Easy integration with other Smithery MCP servers

For more information on using Smithery with your MCP clients, visit the [Smithery documentation](https://smithery.ai/docs).

## 💻 Development

1. Clone the repository:

```bash
git clone https://github.com/yourusername/replicate-flux-mcp.git
cd replicate-flux-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Start development mode:

```bash
npm run dev
```

4. Build the project:

```bash
npm run build
```

## ⚙️ Technical Details

### Stack

- **Model Context Protocol SDK** - Core MCP functionality for tool and resource management
- **Replicate API** - Provides access to state-of-the-art AI image generation models
- **TypeScript** - Ensures type safety and leverages modern JavaScript features
- **Zod** - Implements runtime type validation for robust API interactions

### Configuration

The server can be configured by modifying the `CONFIG` object in `src/config/index.ts`:

```javascript
const CONFIG = {
  serverName: "replicate-flux-mcp",
  serverVersion: "0.1.1",
  imageModelId: "black-forest-labs/flux-schnell",
  svgModelId: "recraft-ai/recraft-v3-svg",
  pollingAttempts: 5,
  pollingInterval: 2000, // ms
};
```

## 🔍 Troubleshooting

### Common Issues

#### Authentication Error
- Ensure your `REPLICATE_API_TOKEN` is correctly set in the environment
- Verify your token is valid by testing it with the Replicate API directly

#### Timeout Error
- The server polls for completion 5 times by default
- For larger images or busy servers, try increasing `pollingAttempts` or `pollingInterval`

#### Safety Filter Triggered
- The model has a built-in safety filter that may block certain prompts
- Try modifying your prompt to avoid potentially problematic content

## 🤝 Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For feature requests or bug reports, please create a GitHub issue. If you like this project, consider starring the repository!

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Replicate API Documentation](https://replicate.com/docs)
- [Flux Schnell Model](https://replicate.com/black-forest-labs/flux-schnell)
- [Recraft V3 SVG Model](https://replicate.com/recraft-ai/recraft-v3-svg)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Smithery Documentation](https://smithery.ai/docs)

---

Made with ❤️ by Yaroslav Boiko

