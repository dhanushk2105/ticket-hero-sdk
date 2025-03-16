# Ticket Hero SDK

![Ticket Hero SDK](https://img.shields.io/npm/v/ticket-hero-sdk)
![License](https://img.shields.io/npm/l/ticket-hero-sdk)
![Node Version](https://img.shields.io/node/v/ticket-hero-sdk)

A command-line Pomodoro timer and task management application designed specifically for developers and Jira users. Ticket Hero helps you track time spent on tickets, earn XP for completing tasks, and manage your work with the Pomodoro technique.

## Features

- **Pomodoro Timer**: Work in focused time intervals with automatic breaks
- **Ticket Management**: Add, view, and edit tickets with story points and allocated time
- **Gamified Experience**: Earn XP and level up as you complete tickets
- **Dashboard**: View statistics and recent activity
- **Jira Integration**: Import tickets from Jira and update their status
- **User Profiles**: Create and update your profile
- **Progress Tracking**: Visual progress bars during Pomodoro sessions
- **Configurable Settings**: Customize Pomodoro durations, XP rates, and UI preferences

## Screenshots

### Main Menu
![Ticket Hero Main Menu](./assets/ticket-hero-main.png)

### Dashboard View
![Ticket Hero Dashboard](./assets/ticket-hero-dashboard.png)

### Pomodoro Timer
![Ticket Hero Timer](./assets/ticket-hero-timer.png)

### Ticket View
![Ticket Hero Ticket View](./assets/ticket-hero-view.png)

## Installation

### Global Installation (Recommended)

```bash
npm install -g ticket-hero-sdk
```

After installation, you can start the application from anywhere using:

```bash
ticket-hero
```

### Local Installation

```bash
npm install ticket-hero-sdk
npx ticket-hero
```

## Usage

### Main Menu

Upon starting Ticket Hero, you'll be presented with the main menu:

1. **Add New Ticket** - Create new tickets with name, story points, and allocated time
2. **View Tickets** - See all your tickets and their status
3. **Start Pomodoro** - Select a ticket to work on with the Pomodoro technique
4. **View Dashboard** - See your stats and recent activity
5. **Edit Ticket** - Modify existing tickets
6. **User Profile** - Update your user profile
7. **Jira Integration** - Import tickets from Jira and update ticket status
8. **Settings** - Configure application settings
9. **Exit** - Close the application

### Pomodoro Controls

During a Pomodoro session, you can use the following keyboard commands:

- **P**: Pause/Resume the timer
- **S**: Skip the current period
- **C**: Complete the ticket
- **Q**: Quit without saving progress

### Jira Integration

Ticket Hero includes integration with Jira to help you manage your work:

1. **Import Tickets from Jira** - Pull your assigned tickets directly into Ticket Hero
2. **Update Jira Ticket Status** - Update ticket status in Jira when completed in Ticket Hero
3. **Setup/Change Jira Connection** - Configure your Jira connection

To set up Jira integration:
1. Go to Settings and enable Jira Integration
2. Go to Jira Integration menu and select "Setup/Change Jira Connection"
3. Enter your Jira host (e.g., `company.atlassian.net`)
4. Enter your Jira email/username
5. Enter your Jira API token
   - For Jira Cloud, create an API token at: https://id.atlassian.com/manage-profile/security/api-tokens
   - For Jira Server, use your regular password

### Configuration

Ticket Hero can be configured by creating or editing the `config.json` file in the same directory as the application. Default settings are provided, but you can customize:

```json
{
  "pomodoro": {
    "workDuration": 25,
    "shortBreakDuration": 5,
    "longBreakDuration": 15,
    "longBreakInterval": 4,
    "autoStartBreaks": true,
    "autoStartPomodoros": false
  },
  "xp": {
    "baseXpPerStoryPoint": 10,
    "earlyCompletionBonusPercent": 20,
    "xpLevelThresholdMultiplier": 100
  },
  "app": {
    "dataFile": "ticket-hero-data.json",
    "backupFrequencyInHours": 24,
    "maxBackups": 5
  },
  "ui": {
    "colorTheme": "default",
    "useEmojis": true,
    "showProgressBar": true
  },
  "jira": {
    "enabled": false,
    "updateTicketOnComplete": true,
    "autoImport": false,
    "autoImportFrequencyInHours": 24
  }
}
```

## Data Storage

All data is stored locally:

- User profile information, tickets, and statistics are saved in `ticket-hero-data.json`
- Configuration is saved in `config.json`
- Jira credentials are securely stored in your system's keychain

## Troubleshooting Jira Integration

If you encounter issues with Jira integration:

1. **No tickets showing up**: 
   - Make sure tickets are assigned to you in Jira
   - Check that tickets are not in the "Done" or "Closed" status
   - Verify your Jira credentials and connection

2. **Can't update ticket status**:
   - Ensure you have permissions to transition the ticket
   - Check the available transitions in your Jira workflow

3. **Connection issues**:
   - For Jira Cloud, make sure you're using an API token, not your password
   - Check that your Jira host URL is correct (e.g., `company.atlassian.net`)

## Contributing

Contributions are welcome! This is an open-source project, and we'd love your help improving it. Here are ways you can contribute:

1. Report bugs by opening issues
2. Submit pull requests for new features or bug fixes
3. Improve documentation
4. Suggest new features or enhancements

Please read our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Ticket Hero uses the following npm packages:

- [chalk](https://www.npmjs.com/package/chalk) - Terminal string styling
- [cli-progress](https://www.npmjs.com/package/cli-progress) - Progress bars in the terminal
- [figlet](https://www.npmjs.com/package/figlet) - ASCII art from text
- [jira-client](https://www.npmjs.com/package/jira-client) - Jira API client
- [keytar](https://www.npmjs.com/package/keytar) - Secure credential storage