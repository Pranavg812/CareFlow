# Fast setup without Docker

CareFlow can run directly on your computer. Docker is optional.

## 1. Use free MongoDB Atlas

1. Create a free shared cluster at [MongoDB Atlas](https://www.mongodb.com/atlas/database).
2. Create a database user and allow your current IP address under **Network Access** (for a quick demo, you may temporarily allow `0.0.0.0/0`).
3. Click **Connect** -> **Drivers**, copy the connection string, and replace `<password>` with the database-user password.
4. Copy `server/.env.example` to `server/.env` and set:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/careflow?retryWrites=true&w=majority
JWT_SECRET=use-a-long-random-private-string-here
CLIENT_URL=http://localhost:5173
```

Never commit `server/.env` or paste its values into chat.

## 2. Install and run

From the project folder:

```bat
npm install
npm run install:all
npm run dev
```

Open `http://localhost:5173`. In a second terminal, seed demo data once:

```bat
npm run seed --prefix server
```

## 3. AI without an API key

Do nothing. If `OPENAI_API_KEY` is blank, CareFlow creates a deterministic fallback pre-visit and post-visit summary. Booking, doctor workflows, reminders, and all other core features still run. The UI marks the summary as a fallback rather than pretending an AI provider responded.

## 4. Email setup (Gmail - fastest demo option)

1. Use a Gmail account you control.
2. Turn on Google account 2-Step Verification.
3. Create a 16-character **App Password**: Google Account -> Security -> App passwords -> select Mail / Windows Computer.
4. Add this to `server/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM=CareFlow <your-gmail-address@gmail.com>
```

Without SMTP values, the app logs email content in the server terminal. That makes local testing possible, but configure SMTP before final submission.

## 5. Google Calendar setup (OAuth 2.0)

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a project.
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen as **External** and add your own Google account as a test user.
4. Create an **OAuth client ID** of type **Web application**.
5. Add this authorised redirect URI exactly:

```text
http://localhost:5000/api/calendar/callback
```

6. Put the client ID and secret in `server/.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
GOOGLE_CALENDAR_ID=primary
```

7. Obtain a refresh token for the same Google account using the OAuth consent flow, then add:

```env
GOOGLE_REFRESH_TOKEN=...
```

The refresh token, client secret, Gmail app password, and MongoDB URI are all private secrets. Keep them only in `.env`.
