# Manna on your iPhone

The real app reaches iPhones through **TestFlight**, Apple's app for testing apps before
they're in the App Store. Expo builds the app on its own servers, so you don't need a Mac.

## 1. Accounts (once)

| Account | Cost | Where | Notes |
|---|---|---|---|
| Apple Developer Program | $99 a year | developer.apple.com/programs/enroll | Enroll as an **organization** (Manna Co.) so the App Store shows the company as the seller. That needs a free D-U-N-S number, which can take one to two weeks. Enrolling as an individual takes a day or two, but shows your personal name. |
| Expo | Free | expo.dev/signup | Builds the app in the cloud. |
| TestFlight | Free | App Store on your iPhone | Installs test builds. |

## 2. Build and send to TestFlight

On any computer (Mac, Windows or Linux) with Node.js installed:

```bash
git clone https://github.com/Nitsuadancy/Claude-Code-Github.git
cd Claude-Code-Github
git checkout claude/modest-faraday-u5umtt   # until this branch is merged
npm install
npx eas-cli@latest login                    # your Expo account
npx eas-cli@latest init                     # links the project to your Expo account (first time only)
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

The build command asks you to sign in with your Apple ID once. Let it create the
certificates for you. About 20 minutes later the build is uploaded to App Store
Connect. Apple then checks it, usually within an hour.

## 3. Install it

1. Open **App Store Connect** (appstoreconnect.apple.com), go to **Apps → Manna → TestFlight**,
   and add yourself under **Internal Testing**.
2. Open the email from TestFlight on your iPhone, or open the TestFlight app. Tap **Install**.

Manna now sits on your home screen like any other app. Each new build shows up in
TestFlight with an **Update** button.

## Adding testers

- **Internal testers** (up to 100 people on your App Store Connect team) get builds right away.
- **External testers** (up to 10,000, such as your first chefs and neighbors) join through a
  public TestFlight link. The first build sent to them needs a short review by Apple, usually a day.

## Settings already in the project

- App ID: `com.mannaapp.manna` (in `app.json`). It can't change after the first App Store upload,
  so change it now if you want a different one.
- Version numbers go up automatically with each build (`eas.json`).
- The app declares that it uses only standard encryption (HTTPS), so TestFlight doesn't ask
  about export compliance each time.
