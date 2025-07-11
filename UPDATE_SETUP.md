# Auto-Update Setup Guide

## Prerequisites
1. Your project must be on GitHub
2. You need a GitHub personal access token with repo permissions

## Setup Instructions

### 1. Update package.json
Replace the placeholders in your `package.json` build configuration:
```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "YOUR_REPO_NAME"
  }
]
```

### 2. Set up GitHub Repository
1. Create a new repository on GitHub (if not already created)
2. Push your code to the repository
3. Go to repository Settings > Actions > General
4. Enable "Allow GitHub Actions to create and approve pull requests"

### 3. Create a GitHub Personal Access Token
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with `repo` scope
3. Copy the token for later use

### 4. Create a Release
To trigger the auto-update system:
1. Update your version in `package.json`
2. Create a git tag: `git tag v1.0.1`
3. Push the tag: `git push origin v1.0.1`
4. GitHub Actions will automatically build and create a release

### 5. Environment Variables (Optional)
For development, you can set these environment variables:
- `GH_TOKEN`: Your GitHub personal access token
- `ELECTRON_ENABLE_LOGGING`: Set to `1` for detailed logs

## How It Works

1. **Update Detection**: The app checks for updates on startup and when the user clicks "Check for Updates"
2. **Download**: If an update is available, it downloads automatically in the background
3. **Installation**: User is prompted to restart the app to apply the update
4. **Automatic**: The process is completely automatic after the initial setup

## Testing Updates

For testing, you can:
1. Build and release version 1.0.1
2. Install it locally
3. Build and release version 1.0.2
4. The app should detect and offer to update to 1.0.2

## Troubleshooting

### Common Issues:
- **No updates detected**: Make sure your GitHub release is published (not draft)
- **Download fails**: Check your internet connection and GitHub token permissions
- **App won't restart**: Try manually restarting the application

### Debug Mode:
Set `ELECTRON_ENABLE_LOGGING=1` to see detailed update logs in the console.
