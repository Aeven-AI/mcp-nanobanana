# Nano Banana - Gemini & Codex CLI Extension

A professional MCP extension for Gemini CLI, Codex CLI, and other MCP-compatible tools, generating and manipulating images using the **google/gemini-2.5-flash-image** model. By default it talks to OpenRouter, but you can point it at any provider that hosts Nano Banana by adjusting the `MODEL_*` environment variables.

## ✨ Features

- **🎨 Text-to-Image Generation**: Create stunning images from descriptive prompts
- **✏️ Image Editing**: Modify existing images with natural language instructions
- **🔧 Image Restoration**: Restore and enhance old or damaged photos
- **📁 Smart File Management**: User-friendly filenames with automatic duplicate prevention

## 📋 Prerequisites

1. **MCP-compatible CLI** installed and configured (Gemini CLI, Codex CLI, etc.)
2. **Node.js 20+** and npm
3. **API Key**: Set `MODEL_API_KEY` (obtainable from OpenRouter or any provider that exposes the Nano Banana / `google/gemini-2.5-flash-image` model)

Optional overrides (useful when targeting providers other than OpenRouter):

- `MODEL_BASE_URL` – alternate provider endpoint (default: `https://openrouter.ai/api/v1`)
- `MODEL_ID` – override model id (default: `google/gemini-2.5-flash-image`)
- `MODEL_REFERER` / `MODEL_TITLE` – analytics headers for providers that require them
- `MODEL_GENERATE_PATH` – alternate generation endpoint path (default: `/responses`)

If you are using OpenRouter, refer to their [authentication guide](https://openrouter.ai/docs#authenticate) for generating API keys. For other providers that host the same model, consult their documentation for equivalent credentials.

### Key Components

- **`index.ts`**: MCP server using `@modelcontextprotocol/sdk` for professional protocol handling
- **`imageGenerator.ts`**: Handles all OpenRouter API interactions and response processing
- **`fileHandler.ts`**: Manages file I/O, smart filename generation, and file searching
- **`types.ts`**: Shared TypeScript interfaces for type safety

## 🚀 Installation

### 1. Install Extension (Gemini CLI)

Install the extension using the `gemini extensions install` command:

```bash
gemini extensions install https://github.com/gemini-cli-extensions/nanobanana
```

### 1b. Register with Codex CLI

Add the MCP server to your Codex CLI configuration (default path: `~/.config/codex/mcp.json`):

```json
{
  "servers": {
    "nanobanana": {
      "command": "node",
      "args": ["/path/to/nanobanana/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

Restart Codex CLI after updating the configuration. Adjust the path to match your local checkout.

### 2. Activate

Restart your MCP CLI (Gemini CLI, Codex CLI, etc.). The following commands will be available:

- `/generate` - Single or multiple image generation with style/variation options
- `/edit` - Image editing
- `/restore` - Image restoration
- `/icon` - Generate app icons, favicons, and UI elements in multiple sizes
- `/pattern` - Generate seamless patterns and textures for backgrounds
- `/story` - Generate sequential images that tell a visual story or process
- `/diagram` - Generate technical diagrams, flowcharts, and architectural mockups
- `/nanobanana` - Natural language interface

## 💡 Usage

The extension provides multiple command options for different use cases:

> **Note:** Examples below use Gemini CLI slash commands. In Codex CLI and other MCP clients, call the same MCP tools (`generate_image`, `edit_image`, etc.) using the syntax your client provides.

### 🎯 Specific Commands (Recommended)

**Generate Images:**

```bash
# Single image
/generate "a watercolor painting of a fox in a snowy forest"

# Multiple variations with preview
/generate "sunset over mountains" --count=3 --preview

# Style variations
/generate "mountain landscape" --styles="watercolor,oil-painting" --count=4

# Specific variations with auto-preview
/generate "coffee shop interior" --variations="lighting,mood" --preview
```

**Edit Images:**

```bash
/edit my_photo.png "add sunglasses to the person"
/edit portrait.jpg "change background to a beach scene" --preview
```

**Restore Images:**

```bash
/restore old_family_photo.jpg "remove scratches and improve clarity"
/restore damaged_photo.png "enhance colors and fix tears" --preview
```

**Generate Icons:**

```bash
# App icon in multiple sizes
/icon "coffee cup logo" --sizes="64,128,256" --type="app-icon" --preview

# Favicon set
/icon "company logo" --type="favicon" --sizes="16,32,64"

# UI elements
/icon "settings gear icon" --type="ui-element" --style="minimal"
```

**Create Patterns:**

```bash
# Seamless pattern
/pattern "geometric triangles" --type="seamless" --style="geometric" --preview

# Background texture
/pattern "wood grain texture" --type="texture" --colors="mono"

# Wallpaper pattern
/pattern "floral design" --type="wallpaper" --density="sparse"
```

**Generate Stories:**

```bash
# Visual story sequence
/story "a seed growing into a tree" --steps=4 --type="process" --preview

# Step-by-step tutorial
/story "how to make coffee" --steps=6 --type="tutorial"

# Timeline visualization
/story "evolution of smartphones" --steps=5 --type="timeline"
```

**Create Diagrams:**

```bash
# System flowchart
/diagram "user login process" --type="flowchart" --style="professional" --preview

# Architecture diagram
/diagram "microservices architecture" --type="architecture" --complexity="detailed"

# Database schema
/diagram "e-commerce database design" --type="database" --layout="hierarchical"
```

### 🌟 Natural Language Command (Flexible)

**Open-ended prompts:**

```bash
/nanobanana create a logo for my tech startup
/nanobanana I need 5 different versions of a cat illustration in various art styles
/nanobanana fix the lighting in sunset.jpg and make it more vibrant
```

## 🎨 Advanced Generation Options

The `/generate` command supports advanced options for creating multiple variations with different styles and parameters.

### Generation Options

**`--count=N`** - Number of variations (1-8, default: 1)
**`--styles="style1,style2"`** - Comma-separated artistic styles
**`--variations="var1,var2"`** - Specific variation types  
**`--format=grid|separate`** - Output format (default: separate)
**`--seed=123`** - Seed for reproducible variations
**`--preview`** - Automatically open generated images in default viewer

### Available Styles

- `photorealistic` - Photographic quality images
- `watercolor` - Watercolor painting style
- `oil-painting` - Oil painting technique
- `sketch` - Hand-drawn sketch style
- `pixel-art` - Retro pixel art style
- `anime` - Anime/manga art style
- `vintage` - Vintage/retro aesthetic
- `modern` - Contemporary/modern style
- `abstract` - Abstract art style
- `minimalist` - Clean, minimal design

### Available Variations

- `lighting` - Different lighting conditions (dramatic, soft)
- `angle` - Various viewing angles (above, close-up)
- `color-palette` - Different color schemes (warm, cool)
- `composition` - Different layouts (centered, rule-of-thirds)
- `mood` - Various emotional tones (cheerful, dramatic)
- `season` - Different seasons (spring, winter)
- `time-of-day` - Different times (sunrise, sunset)

### Advanced Examples

**Style Variations:**

```bash
/generate "mountain landscape" --styles="watercolor,oil-painting,sketch,photorealistic"
# Creates the same mountain scene in 4 different artistic styles
```

**Multiple Variations:**

```bash
/generate "cozy coffee shop" --variations="lighting,mood" --count=4
# Generates: dramatic lighting, soft lighting, cheerful mood, dramatic mood versions
```

**Combined Options:**

```bash
/generate "friendly robot character" --styles="anime,minimalist" --variations="color-palette"
# Creates anime and minimalist versions with different color palettes
```

**Simple Multiple Generation:**

```bash
/generate "tech startup logo" --count=6
# Generates 6 different interpretations of the same prompt
```

## 🎯 Icon Generation

The `/icon` command specializes in creating app icons, favicons, and UI elements with proper sizing and formatting.

### Icon Options

**`--sizes="16,32,64"`** - Array of icon sizes in pixels (common: 16, 32, 64, 128, 256, 512, 1024)
**`--type="app-icon|favicon|ui-element"`** - Icon type (default: app-icon)
**`--style="flat|skeuomorphic|minimal|modern"`** - Visual style (default: modern)
**`--format="png|jpeg"`** - Output format (default: png)
**`--background="transparent|white|black|color"`** - Background type (default: transparent)
**`--corners="rounded|sharp"`** - Corner style for app icons (default: rounded)

### Icon Examples

```bash
# Complete app icon set
/icon "productivity app with checklist" --sizes="64,128,256,512" --corners="rounded"

# Website favicon package
/icon "mountain logo" --type="favicon" --sizes="16,32,64" --format="png"

# UI element set
/icon "notification bell" --type="ui-element" --style="flat" --background="transparent"
```

## 🎨 Pattern & Texture Generation

The `/pattern` command creates seamless patterns and textures perfect for backgrounds and design elements.

### Pattern Options

**`--size="256x256"`** - Pattern tile size (common: 128x128, 256x256, 512x512)
**`--type="seamless|texture|wallpaper"`** - Pattern type (default: seamless)
**`--style="geometric|organic|abstract|floral|tech"`** - Pattern style (default: abstract)
**`--density="sparse|medium|dense"`** - Element density (default: medium)
**`--colors="mono|duotone|colorful"`** - Color scheme (default: colorful)
**`--repeat="tile|mirror"`** - Tiling method for seamless patterns (default: tile)

### Pattern Examples

```bash
# Website background pattern
/pattern "subtle geometric hexagons" --type="seamless" --colors="duotone" --density="sparse"

# Material texture
/pattern "brushed metal surface" --type="texture" --style="tech" --colors="mono"

# Decorative wallpaper
/pattern "art deco design" --type="wallpaper" --style="geometric" --size="512x512"
```

## 📖 Visual Storytelling

The `/story` command generates sequential images that tell a visual story or demonstrate a step-by-step process.

### Story Options

**`--steps=N`** - Number of sequential images (2-8, default: 4)
**`--type="story|process|tutorial|timeline"`** - Sequence type (default: story)
**`--style="consistent|evolving"`** - Visual consistency across frames (default: consistent)
**`--layout="separate|grid|comic"`** - Output layout (default: separate)
**`--transition="smooth|dramatic|fade"`** - Transition style between steps (default: smooth)
**`--format="storyboard|individual"`** - Output format (default: individual)

### Story Examples

```bash
# Product development process
/story "idea to launched product" --steps=5 --type="process" --style="consistent"

# Educational tutorial
/story "git workflow tutorial" --steps=6 --type="tutorial" --layout="comic"

# Brand evolution timeline
/story "company logo evolution" --steps=4 --type="timeline" --transition="smooth"
```

## 📊 Technical Diagrams

The `/diagram` command generates professional technical diagrams, flowcharts, and architectural mockups from simple text descriptions.

### Diagram Options

**`--type="flowchart|architecture|network|database|wireframe|mindmap|sequence"`** - Diagram type (default: flowchart)
**`--style="professional|clean|hand-drawn|technical"`** - Visual style (default: professional)
**`--layout="horizontal|vertical|hierarchical|circular"`** - Layout orientation (default: hierarchical)
**`--complexity="simple|detailed|comprehensive"`** - Level of detail (default: detailed)
**`--colors="mono|accent|categorical"`** - Color scheme (default: accent)
**`--annotations="minimal|detailed"`** - Label and annotation level (default: detailed)

### Diagram Types & Use Cases

- **flowchart**: Process flows, decision trees, workflows
- **architecture**: System architecture, microservices, infrastructure
- **network**: Network topology, server configurations
- **database**: Database schemas, entity relationships
- **wireframe**: UI/UX mockups, page layouts
- **mindmap**: Concept maps, idea hierarchies
- **sequence**: Sequence diagrams, API interactions

### Diagram Examples

```bash
# Development workflow
/diagram "CI/CD pipeline with testing stages" --type="flowchart" --complexity="detailed"

# System design
/diagram "chat application architecture" --type="architecture" --style="technical"

# API documentation
/diagram "REST API authentication flow" --type="sequence" --layout="vertical"

# Database design
/diagram "social media database schema" --type="database" --annotations="detailed"
```

## 📁 File Management

### Smart Filename Generation

Images are saved with user-friendly names based on your prompts:

- `"sunset over mountains"` → `sunset_over_mountains.png`
- `"abstract art piece"` → `abstract_art_piece.png`

### Automatic Duplicate Prevention

If a file already exists, a counter is automatically added:

- `sunset_over_mountains.png`
- `sunset_over_mountains_1.png`
- `sunset_over_mountains_2.png`

### File Search Locations

For editing/restoration, the extension searches for input images in:

1. Current working directory
2. `./images/` subdirectory
3. `./input/` subdirectory
4. `./nanobanana-output/` subdirectory
5. `~/Downloads/`
6. `~/Desktop/`

### Output Directory

Generated images are saved to `./nanobanana-output/` which is created automatically.

## 🛠️ Development

### Build Commands

```bash
# Build the MCP server
npm run build

# Install MCP server dependencies
npm run install-deps

# Development mode with file watching
npm run dev
```

### MCP Server Commands

```bash
# Build MCP server directly
cd mcp-server && npm run build

# Start server standalone (for testing)
cd mcp-server && npm start

# Development mode with TypeScript watching
cd mcp-server && npm run dev
```

### Tests

```bash
# 1. Create mcp-server/.env with MODEL_API_KEY=<your key>
# 2. Run the integration suite
cd mcp-server && npm test
```

The suite generates:
- A watercolor fox scene
- An edited version of that scene
- A coffee cup app icon

Images are saved in `mcp-server/nanobanana-output/` for inspection (they are not deleted).

## 🔧 Technical Details

### MCP Server Protocol

The extension uses the official Model Context Protocol (MCP) SDK for robust client-server communication:

- **Protocol**: JSON-RPC over stdio
- **SDK**: `@modelcontextprotocol/sdk`
- **Tools**: `generate_image`, `edit_image`, `restore_image`

### API Integration

- **Model**: `google/gemini-2.5-flash-image` (configurable via environment variable)
- **Transport**: Direct HTTP requests (OpenRouter by default; set `MODEL_BASE_URL` to target other providers hosting the model)
- **Response Handling**: Base64 decoding with graceful fallbacks for missing image data
- **Output Size**: All images are returned at 1024×1024 resolution (model maximum)

### Error Handling

- Comprehensive error messages with debugging information
- Graceful fallbacks for API response parsing
- File validation and search path reporting

## 🐛 Troubleshooting

### Common Issues

1. **"Command not recognized"**: Verify the MCP server is registered for your CLI (e.g., `~/.gemini/extensions/nanobanana-extension/` for Gemini CLI, Codex CLI configuration for Codex users) and restart the client

2. **"No API key found"**: Set the `MODEL_API_KEY` environment variable:

   ```bash
   export MODEL_API_KEY="your-model-provider-key"
   ```


3. **"Build failed"**: Ensure Node.js 18+ is installed and run:

   ```bash
   npm run install-deps && npm run build
   ```

4. **"Image not found"**: Check that input files are in one of the searched directories (see File Search Locations above)

### Debug Mode

The MCP server includes detailed debug logging that appears in your CLI console (Gemini CLI, Codex CLI, etc.) to help diagnose issues.

## 📄 Legal

- **License**: [Apache License 2.0](LICENSE)
- **Security**: [Security Policy](SECURITY.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes in the modular architecture
4. Run `npm run build` to ensure compilation
5. Test with your MCP CLI (Gemini CLI, Codex CLI, etc.)
6. Submit a pull request
