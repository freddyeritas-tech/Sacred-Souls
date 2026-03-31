# Sacred Souls - Conscious Social Network

A spiritual social media mobile app built with Expo/React Native and FastAPI.

## Features

### Free Features
- 🌟 **Daily AI-Generated Quotes** - Personalized spiritual inspiration based on your interests
- 👥 **Join Circles** - Browse and join spiritual communities
- 📰 **Social Feed** - Share your spiritual journey with posts
- 💖 **Questionnaire** - Discover your spiritual path

### Premium Features (€10/month)
- ✨ **Create Circles** - Build your own spiritual communities
- 🌿 **Nature Gatherings** - Organize in-person meetups
- 📹 **Virtual Gatherings** - Host online spiritual sessions with video calls
- 💬 **Group Chat** - Real-time messaging within circles
- 🔔 **Custom Notifications** - Schedule your own reminders
- 🚫 **Ad-Free Experience**

## Tech Stack

- **Frontend**: Expo / React Native with expo-router
- **Backend**: FastAPI with MongoDB
- **Authentication**: Email/Password + Google OAuth
- **Payments**: Stripe (test mode)
- **Video Calls**: Jitsi Meet (free, no API key required)
- **AI**: OpenAI GPT-4o-mini via Emergent LLM

## Getting Started

### Development

```bash
# Frontend
cd frontend
yarn install
yarn start

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK for Android
eas build --platform android --profile preview

# Build for iOS
eas build --platform ios --profile preview
```

## Environment Variables

### Backend (.env)
```
MONGO_URL=your_mongodb_url
DB_NAME=sacred_souls
STRIPE_API_KEY=your_stripe_key
EMERGENT_LLM_KEY=your_llm_key
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=your_backend_url
```

## App Store Checklist

- [x] App icon (mandala design)
- [x] Privacy policy
- [x] Camera/microphone permissions declared
- [x] App metadata in app.json
- [ ] Screenshots for store listing
- [ ] App Store / Play Store developer account

## License

Proprietary - All rights reserved

## Contact

privacy@sacredsouls.app
