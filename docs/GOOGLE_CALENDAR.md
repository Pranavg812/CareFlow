# Google Calendar Setup

CareFlow can synchronize appointments with Google Calendar using OAuth 2.0.

## Required Environment Variables

Configure these values in the server environment:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary


## Setup

1. Create or select a Google Cloud project.
2. Enable the Google Calendar API.
3. Configure an OAuth consent screen.
4. Create an OAuth 2.0 Client ID.
5. Add the application's redirect URI.
6. Complete the OAuth authorization flow.
7. Obtain a refresh token with Calendar access.
8. Add the credentials to the server `.env` file.

Never commit the real credentials or refresh token to GitHub.