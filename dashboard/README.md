# Routex Dashboard

Modern React 19 + Tailwind CSS 4 dashboard for Routex AI API Router.

## Features

- ⚛️ **React 19 RC** - Latest React with improved performance
- 🎨 **Tailwind CSS 4** - Modern utility-first CSS framework  
- ⚡ **Vite** - Lightning-fast build tool
- 📊 **Real-time Stats** - Live system monitoring
- 🔄 **CRUD Operations** - Full channel management
- 🎯 **Load Balancer Control** - Dynamic strategy switching
- 📱 **Responsive Design** - Works on all devices

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## Production Build

The dashboard builds to `../public/dashboard/` directory, which is served by the main Routex server at `/dashboard`.

## Tech Stack

- **React 19 RC** - UI framework
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Bun** - Package manager & runtime

## Components

- `Dashboard.tsx` - Main stats and controls
- `ChannelList.tsx` - Channel management
- `ChannelModal.tsx` - Create/Edit channel form
- `Toast.tsx` - Notification system

## API Integration

The dashboard communicates with the Routex API:

- `GET /api` - System status
- `GET /api/channels` - List channels
- `POST /api/channels` - Create channel
- `PUT /api/channels/:name` - Update channel
- `DELETE /api/channels/:name` - Delete channel
- `PUT /api/strategy` - Change load balancer strategy
