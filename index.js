#!/usr/bin/env node

// ticket-hero-sdk - A Pomodoro App for Jira Users
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');
const cliProgress = require('cli-progress');
const jiraHelper = require('./jira-helper');
const configHelper = require('./config-helper');

// Load configuration
let config = configHelper.loadConfig();

// Constants from config
const WORK_DURATION = config.pomodoro.workDuration;
const SHORT_BREAK_DURATION = config.pomodoro.shortBreakDuration;
const LONG_BREAK_DURATION = config.pomodoro.longBreakDuration;
const POMODOROS_BEFORE_LONG_BREAK = config.pomodoro.longBreakInterval;
const DATA_FILE = config.app.dataFile;

// Data structure
let userData = {
  user: {
    name: '',
    xp: 0,
    level: 1
  },
  tickets: [],
  stats: {
    totalTicketsSolved: 0,
    totalTimeTaken: 0,
    totalOvertime: 0,
    totalStoryPoints: 0,
    totalStoryPointsPending: 0
  }
};

// Initialize readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      console.log(chalk.blue('Loading existing data file...'));
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      userData = JSON.parse(data);
      console.log(chalk.green('✓ Data loaded successfully!'));
    } else {
      console.log(chalk.yellow('No existing data found. Starting fresh!'));
      saveData(); // Create the initial file
    }
  } catch (error) {
    console.error(chalk.red('Error loading data:'), error);
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2), 'utf8');
  } catch (error) {
    console.error(chalk.red('Error saving data:'), error);
  }
}

// Calculate pending stats
function calculatePendingStats() {
  const pendingTickets = userData.tickets.filter(ticket => !ticket.completed);
  userData.stats.totalTicketsPending = pendingTickets.length;
  userData.stats.totalStoryPointsPending = pendingTickets.reduce((sum, ticket) => sum + ticket.storyPoints, 0);
  saveData();
}

// Update XP based on performance
function updateXP(ticket, actualTime) {
  const allocatedTime = ticket.allocatedTime;
  const overtime = Math.max(0, actualTime - allocatedTime);
  
  // Base XP for completing a ticket
  let xpEarned = ticket.storyPoints * config.xp.baseXpPerStoryPoint;
  
  // XP penalty for overtime
  if (overtime > 0) {
    const penaltyPercentage = Math.min(100, Math.floor((overtime / allocatedTime) * 100));
    const penalty = Math.floor((xpEarned * penaltyPercentage) / 100);
    xpEarned = Math.max(0, xpEarned - penalty);
    
    console.log(chalk.yellow(`⚠️ Overtime penalty: -${penalty} XP (${penaltyPercentage}% penalty)`));
  } else {
    // Bonus for finishing early
    const earlyBonus = Math.floor(xpEarned * (config.xp.earlyCompletionBonusPercent / 100));
    xpEarned += earlyBonus;
    console.log(chalk.green(`🎉 Early completion bonus: +${earlyBonus} XP`));
  }
  
  userData.user.xp += xpEarned;
  
  // Level up if XP threshold reached
  const xpThreshold = userData.user.level * config.xp.xpLevelThresholdMultiplier;
  if (userData.user.xp >= xpThreshold) {
    userData.user.level += 1;
    console.log(chalk.magenta(`🏆 LEVEL UP! You are now level ${userData.user.level}!`));
  }
  
  console.log(chalk.blue(`💫 XP earned: ${xpEarned}. Total XP: ${userData.user.xp}`));
  saveData();
}

// Format time in MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Main menu
function showMainMenu() {
  console.clear();
  try {
    const title = figlet.textSync('Ticket Hero', { font: 'Standard' });
    console.log(chalk.bold.cyan(title));
  } catch (error) {
    console.log(chalk.bold.cyan('==== TICKET HERO ===='));
  }
  console.log(chalk.bold.blue('A Pomodoro App for Jira Users\n'));
  
  if (userData.user.name) {
    console.log(chalk.blue(`Hello, ${userData.user.name}! Level: ${userData.user.level} | XP: ${userData.user.xp}\n`));
  }

  console.log(chalk.bold.white('Main Menu:'));
  console.log(chalk.white('1.'), chalk.green('Add New Ticket'));
  console.log(chalk.white('2.'), chalk.green('View Tickets'));
  console.log(chalk.white('3.'), chalk.green('Start Pomodoro'));
  console.log(chalk.white('4.'), chalk.green('View Dashboard'));
  console.log(chalk.white('5.'), chalk.green('Edit Ticket'));
  console.log(chalk.white('6.'), chalk.green('User Profile'));
  console.log(chalk.white('7.'), chalk.green('Jira Integration'));
  console.log(chalk.white('8.'), chalk.green('Settings'));
  console.log(chalk.white('9.'), chalk.green('Exit'));

  rl.question(chalk.yellow('\nSelect option: '), (answer) => {
    switch (answer) {
      case '1':
        addNewTicket();
        break;
      case '2':
        viewTickets();
        break;
      case '3':
        selectTicketForPomodoro();
        break;
      case '4':
        showDashboard();
        break;
      case '5':
        editTicket();
        break;
      case '6':
        userProfile();
        break;
      case '7':
        jiraIntegration();
        break;
      case '8':
        settings();
        break;
      case '9':
        console.log(chalk.green('\nThanks for using Ticket Hero! Goodbye!'));
        rl.close();
        break;
      default:
        console.log(chalk.red('\nInvalid option!'));
        setTimeout(showMainMenu, 1000);
    }
  });
}

// Settings menu
function settings() {
  console.clear();
  console.log(chalk.bold.blue('===== Settings =====\n'));
  
  console.log(chalk.bold.white('Pomodoro Settings:'));
  console.log(chalk.white(`1. Work Duration: ${config.pomodoro.workDuration} minutes`));
  console.log(chalk.white(`2. Short Break Duration: ${config.pomodoro.shortBreakDuration} minutes`));
  console.log(chalk.white(`3. Long Break Duration: ${config.pomodoro.longBreakDuration} minutes`));
  console.log(chalk.white(`4. Pomodoros Before Long Break: ${config.pomodoro.longBreakInterval}`));
  console.log(chalk.white(`5. Auto-start Breaks: ${config.pomodoro.autoStartBreaks ? 'Enabled' : 'Disabled'}`));
  console.log(chalk.white(`6. Auto-start Pomodoros: ${config.pomodoro.autoStartPomodoros ? 'Enabled' : 'Disabled'}`));
  
  console.log(chalk.bold.white('\nXP Settings:'));
  console.log(chalk.white(`7. Base XP per Story Point: ${config.xp.baseXpPerStoryPoint}`));
  console.log(chalk.white(`8. Early Completion Bonus: ${config.xp.earlyCompletionBonusPercent}%`));
  
  console.log(chalk.bold.white('\nJira Settings:'));
  console.log(chalk.white(`9. Jira Integration: ${config.jira?.enabled ? 'Enabled' : 'Disabled'}`));
  
  console.log(chalk.bold.white('\nOptions:'));
  console.log(chalk.white('0.'), chalk.green('Return to Main Menu'));
  
  rl.question(chalk.yellow('\nSelect setting to change (0-9): '), (answer) => {
    if (answer === '0') {
      showMainMenu();
      return;
    }
    
    const settingIndex = parseInt(answer, 10);
    if (isNaN(settingIndex) || settingIndex < 1 || settingIndex > 9) {
      console.log(chalk.red('\nInvalid option!'));
      setTimeout(settings, 1000);
      return;
    }
    
    switch (settingIndex) {
      case 1:
        rl.question(chalk.yellow('Enter new Work Duration (minutes): '), (value) => {
          const newValue = parseInt(value, 10);
          if (!isNaN(newValue) && newValue > 0) {
            config.pomodoro.workDuration = newValue;
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 2:
        rl.question(chalk.yellow('Enter new Short Break Duration (minutes): '), (value) => {
          const newValue = parseInt(value, 10);
          if (!isNaN(newValue) && newValue > 0) {
            config.pomodoro.shortBreakDuration = newValue;
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 3:
        rl.question(chalk.yellow('Enter new Long Break Duration (minutes): '), (value) => {
          const newValue = parseInt(value, 10);
          if (!isNaN(newValue) && newValue > 0) {
            config.pomodoro.longBreakDuration = newValue;
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 4:
        rl.question(chalk.yellow('Enter new Pomodoros Before Long Break: '), (value) => {
          const newValue = parseInt(value, 10);
          if (!isNaN(newValue) && newValue > 0) {
            config.pomodoro.longBreakInterval = newValue;
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 5:
        rl.question(chalk.yellow(`Auto-start Breaks (y/n, currently ${config.pomodoro.autoStartBreaks ? 'y' : 'n'}): `), (value) => {
          if (value.toLowerCase() === 'y' || value.toLowerCase() === 'n') {
            config.pomodoro.autoStartBreaks = (value.toLowerCase() === 'y');
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 6:
        rl.question(chalk.yellow(`Auto-start Pomodoros (y/n, currently ${config.pomodoro.autoStartPomodoros ? 'y' : 'n'}): `), (value) => {
          if (value.toLowerCase() === 'y' || value.toLowerCase() === 'n') {
            config.pomodoro.autoStartPomodoros = (value.toLowerCase() === 'y');
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 7:
        rl.question(chalk.yellow('Enter new Base XP per Story Point: '), (value) => {
          const newValue = parseInt(value, 10);
          if (!isNaN(newValue) && newValue > 0) {
            config.xp.baseXpPerStoryPoint = newValue;
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 8:
        rl.question(chalk.yellow('Enter new Early Completion Bonus (%): '), (value) => {
          const newValue = parseInt(value, 10);
          if (!isNaN(newValue) && newValue >= 0) {
            config.xp.earlyCompletionBonusPercent = newValue;
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
          }
          setTimeout(settings, 1500);
        });
        break;
      case 9:
        rl.question(chalk.yellow(`Enable Jira Integration (y/n, currently ${config.jira?.enabled ? 'y' : 'n'}): `), (value) => {
          if (value.toLowerCase() === 'y' || value.toLowerCase() === 'n') {
            if (!config.jira) config.jira = {};
            config.jira.enabled = (value.toLowerCase() === 'y');
            configHelper.saveConfig(config);
            console.log(chalk.green('\n✓ Setting updated!'));
            
            if (config.jira.enabled) {
              console.log(chalk.blue('\nWould you like to configure Jira connection now?'));
              rl.question(chalk.yellow('Configure Jira now? (y/n): '), async (configAnswer) => {
                if (configAnswer.toLowerCase() === 'y') {
                  await jiraHelper.setupJira(rl);
                }
                setTimeout(settings, 1500);
              });
            } else {
              setTimeout(settings, 1500);
            }
          } else {
            console.log(chalk.red('\n✗ Invalid value. Setting not changed.'));
            setTimeout(settings, 1500);
          }
        });
        break;
      default:
        setTimeout(settings, 1000);
    }
  });
}

// User profile setup/edit
function userProfile() {
  console.clear();
  console.log(chalk.bold.magenta('===== User Profile =====\n'));
  
  if (userData.user.name) {
    console.log(chalk.blue(`Current name: ${userData.user.name}`));
    console.log(chalk.blue(`Level: ${userData.user.level}`));
    console.log(chalk.blue(`XP: ${userData.user.xp}`));
    
    rl.question(chalk.yellow('\nWould you like to change your name? (y/n): '), (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.question(chalk.yellow('Enter new name: '), (name) => {
          userData.user.name = name;
          saveData();
          console.log(chalk.green('\nName updated successfully!'));
          setTimeout(showMainMenu, 1500);
        });
      } else {
        setTimeout(showMainMenu, 500);
      }
    });
  } else {
    rl.question(chalk.yellow('Enter your name: '), (name) => {
      userData.user.name = name;
      saveData();
      console.log(chalk.green('\nProfile created successfully!'));
      setTimeout(showMainMenu, 1500);
    });
  }
}

// Add new ticket
function addNewTicket() {
  console.clear();
  console.log(chalk.bold.green('===== Add New Ticket =====\n'));
  
  rl.question(chalk.yellow('Ticket Name/ID: '), (name) => {
    rl.question(chalk.yellow('Story Points (1-10): '), (points) => {
      const storyPoints = parseInt(points, 10) || 1;
      
      rl.question(chalk.yellow('Allocated Time (minutes): '), (time) => {
        const allocatedTimeMinutes = parseInt(time, 10) || 25;
        
        const ticket = {
          id: Date.now().toString(),
          name: name,
          storyPoints: storyPoints,
          allocatedTime: allocatedTimeMinutes,
          timeSpent: 0,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        userData.tickets.push(ticket);
        calculatePendingStats();
        saveData();
        
        console.log(chalk.green('\n✓ Ticket added successfully!'));
        setTimeout(showMainMenu, 1500);
      });
    });
  });
}

// View tickets
function viewTickets() {
  console.clear();
  console.log(chalk.bold.blue('===== Your Tickets =====\n'));
  
  if (userData.tickets.length === 0) {
    console.log(chalk.yellow('No tickets yet. Add some first!'));
    console.log(chalk.gray('\nPress Enter to return to main menu...'));
    rl.question('', () => {
      showMainMenu();
    });
    return;
  }
  
  // Create a beautiful table
  console.log(chalk.cyan('╔═════╦══════════════════════╦═════╦═══════════════╦════════════╦═══════════╗'));
  console.log(chalk.cyan('║ ID  ║ Ticket              ║ SP  ║ Time Allocated ║ Time Spent ║ Status    ║'));
  console.log(chalk.cyan('╠═════╬══════════════════════╬═════╬═══════════════╬════════════╬═══════════╣'));
  
  userData.tickets.forEach((ticket, index) => {
    const id = (index + 1).toString().padEnd(3);
    const name = ticket.name.substring(0, 18).padEnd(18);
    const sp = ticket.storyPoints.toString().padEnd(3);
    const allocated = `${ticket.allocatedTime} min`.padEnd(13);
    const spent = `${ticket.timeSpent} min`.padEnd(10);
    const status = ticket.completed ? chalk.green('Completed') : chalk.yellow('Pending');
    
    console.log(chalk.cyan('║ ') + chalk.white(`${id}`) + chalk.cyan(' ║ ') + 
                chalk.white(`${name}`) + chalk.cyan(' ║ ') + 
                chalk.white(`${sp}`) + chalk.cyan(' ║ ') + 
                chalk.white(`${allocated}`) + chalk.cyan(' ║ ') + 
                chalk.white(`${spent}`) + chalk.cyan(' ║ ') + 
                `${status}` + chalk.cyan(' ║'));
  });
  
  console.log(chalk.cyan('╚═════╩══════════════════════╩═════╩═══════════════╩════════════╩═══════════╝'));
  
  console.log(chalk.gray('\nPress Enter to return to main menu...'));
  rl.question('', () => {
    showMainMenu();
  });
}

// Edit ticket
function editTicket() {
  console.clear();
  console.log(chalk.bold.yellow('===== Edit Ticket =====\n'));
  
  if (userData.tickets.length === 0) {
    console.log(chalk.yellow('No tickets to edit!'));
    setTimeout(showMainMenu, 1500);
    return;
  }
  
  const pendingTickets = userData.tickets.filter(ticket => !ticket.completed);
  
  if (pendingTickets.length === 0) {
    console.log(chalk.yellow('No pending tickets to edit!'));
    setTimeout(showMainMenu, 1500);
    return;
  }
  
  console.log(chalk.blue('Pending Tickets:'));
  pendingTickets.forEach((ticket, index) => {
    console.log(chalk.white(`${index + 1}.`), chalk.green(`${ticket.name}`), 
                chalk.gray(`(SP: ${ticket.storyPoints}, Time: ${ticket.allocatedTime}min)`));
  });
  
  rl.question(chalk.yellow('\nSelect ticket to edit (number) or 0 to cancel: '), (answer) => {
    const ticketIndex = parseInt(answer, 10) - 1;
    
    if (ticketIndex === -1 || isNaN(ticketIndex) || ticketIndex < 0 || ticketIndex >= pendingTickets.length) {
      showMainMenu();
      return;
    }
    
    const ticket = pendingTickets[ticketIndex];
    
    console.clear();
    console.log(chalk.bold.yellow(`===== Editing Ticket: ${ticket.name} =====`));
    console.log(chalk.gray('Leave blank to keep current value\n'));
    
    rl.question(chalk.yellow(`New Ticket Name (current: ${ticket.name}): `), (name) => {
      if (name) ticket.name = name;
      
      rl.question(chalk.yellow(`New Story Points (current: ${ticket.storyPoints}): `), (points) => {
        if (points) ticket.storyPoints = parseInt(points, 10);
        
        rl.question(chalk.yellow(`New Allocated Time in minutes (current: ${ticket.allocatedTime}): `), (time) => {
          if (time) ticket.allocatedTime = parseInt(time, 10);
          
          saveData();
          console.log(chalk.green('\n✓ Ticket updated successfully!'));
          setTimeout(showMainMenu, 1500);
        });
      });
    });
  });
}

// Select ticket for pomodoro
function selectTicketForPomodoro() {
  console.clear();
  console.log(chalk.bold.green('===== Start Pomodoro =====\n'));
  
  const pendingTickets = userData.tickets.filter(ticket => !ticket.completed);
  
  if (pendingTickets.length === 0) {
    console.log(chalk.yellow('No pending tickets found. Add some first!'));
    setTimeout(showMainMenu, 1500);
    return;
  }
  
  console.log(chalk.blue('Select a ticket to work on:'));
  pendingTickets.forEach((ticket, index) => {
    console.log(chalk.white(`${index + 1}.`), chalk.green(`${ticket.name}`), 
                chalk.gray(`(SP: ${ticket.storyPoints}, Time: ${ticket.allocatedTime}min)`));
  });
  
  rl.question(chalk.yellow('\nSelect ticket (number) or 0 to cancel: '), (answer) => {
    const ticketIndex = parseInt(answer, 10) - 1;
    
    if (ticketIndex === -1 || isNaN(ticketIndex) || ticketIndex < 0 || ticketIndex >= pendingTickets.length) {
      showMainMenu();
      return;
    }
    
    const ticket = pendingTickets[ticketIndex];
    startPomodoro(ticket);
  });
}

// Pomodoro timer
function startPomodoro(ticket) {
  // Variable to track when we should force redraw the screen completely
  let lastFullDraw = 0;
  let userInputBuffer = '';
  
  // Function to redraw the timer display
  function drawTimerDisplay(timeRemaining, mode, isPaused, ticketTimeInfo = null) {
    console.clear();
    
    // Title section
    console.log(chalk.bold.magenta(`🍅 Pomodoro for: ${ticket.name}`));
    console.log(chalk.blue(`Story Points: ${ticket.storyPoints} | Allocated Time: ${ticket.allocatedTime} minutes\n`));
    
    // Timer section
    const modeColor = mode === 'work' ? chalk.red : (mode === 'shortBreak' ? chalk.cyan : chalk.blue);
    console.log(modeColor(`=== ${mode.toUpperCase()} MODE ===`));
    
    // Format the time remaining nicely
    const timeStr = formatTime(timeRemaining);
    console.log(chalk.bold.white(`Time Remaining: ${timeStr}\n`));
    
    // Show progress bar
    try {
      const progressBar = new cliProgress.SingleBar({
        format: `${chalk.cyan('{bar}')} | {percentage}%`,
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true,
        clearOnComplete: false
      });
      
      let duration = 0;
      if (mode === 'work') {
        duration = WORK_DURATION * 60;
      } else if (mode === 'shortBreak') {
        duration = SHORT_BREAK_DURATION * 60;
      } else {
        duration = LONG_BREAK_DURATION * 60;
      }
      
      progressBar.start(duration, duration - timeRemaining);
      progressBar.update(duration - timeRemaining);
      progressBar.stop();
    } catch (e) {
      // Fallback if progress bar fails
      const percentage = mode === 'work' 
        ? Math.round(((WORK_DURATION * 60 - timeRemaining) / (WORK_DURATION * 60)) * 100)
        : mode === 'shortBreak'
          ? Math.round(((SHORT_BREAK_DURATION * 60 - timeRemaining) / (SHORT_BREAK_DURATION * 60)) * 100)
          : Math.round(((LONG_BREAK_DURATION * 60 - timeRemaining) / (LONG_BREAK_DURATION * 60)) * 100);
      
      console.log(`Progress: ${percentage}%`);
    }
    
    // Show ticket time information if provided
    if (ticketTimeInfo && mode === 'work') {
      console.log();
      if (ticketTimeInfo.isOvertime) {
        console.log(chalk.red(`⚠️ OVERTIME: ${formatTime(ticketTimeInfo.overtimeSeconds)}`));
      } else {
        console.log(chalk.green(`🎯 Allocation Remaining: ${formatTime(ticketTimeInfo.remainingSeconds)}`));
      }
    }
    
    // Command help
    console.log('\n' + chalk.bold.white('Commands:'));
    console.log(chalk.yellow('- P: ') + (isPaused ? chalk.green('Resume') : chalk.red('Pause')));
    console.log(chalk.yellow('- S: ') + 'Skip current period');
    console.log(chalk.yellow('- C: ') + 'Complete ticket');
    console.log(chalk.yellow('- Q: ') + 'Quit without saving');
    
    // Current state
    if (isPaused) {
      console.log('\n' + chalk.bold.yellow('⏸️  PAUSED'));
    }
    
    // Show any input being typed
    if (userInputBuffer.length > 0) {
      console.log('\n' + chalk.gray(`Input: ${userInputBuffer}`));
    }
  }
  
  console.clear();
  console.log(chalk.bold.green('Starting Pomodoro session...'));
  
  // Initial variables
  let totalSeconds = 0;
  let timeRemaining = WORK_DURATION * 60; // Start with work duration
  let isPaused = false;
  let mode = 'work';
  let pomodoroCount = 0;
  let startTime = Date.now();
  let lastElapsedTime = 0;
  
  // Handle key presses
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  
  function keyPressHandler(str, key) {
    // Reset user input buffer on any keypress
    userInputBuffer = '';
    
    // Handle control keys
    if (key.ctrl && key.name === 'c') {
      // Allow Ctrl+C to exit properly
      cleanup();
      process.exit();
    }
    
    // Handle specific keys for pomodoro control
    switch (key.name.toLowerCase()) {
      case 'p':
        isPaused = !isPaused;
        if (isPaused) {
          console.log(chalk.yellow('\n⏸️  Timer paused'));
        } else {
          // Adjust start time when resuming
          startTime = Date.now() - (lastElapsedTime * 1000);
          console.log(chalk.green('\n▶️  Timer resumed'));
        }
        // Immediately redraw after pause/resume
        drawTimerDisplay(timeRemaining, mode, isPaused, getTicketTimeInfo());
        break;
      case 's':
        if (mode === 'work') {
          completeWorkPeriod();
        } else {
          startWorkPeriod();
        }
        break;
      case 'c':
        completeTicket();
        break;
      case 'q':
        cleanup();
        showMainMenu();
        break;
      default:
        // For any other key, just show it was pressed
        userInputBuffer = `Key pressed: ${key.name || str}`;
        // Redraw to show the key was pressed
        drawTimerDisplay(timeRemaining, mode, isPaused, getTicketTimeInfo());
        // Clear the buffer after a short delay
        setTimeout(() => {
          userInputBuffer = '';
          if (!isPaused) {
            drawTimerDisplay(timeRemaining, mode, isPaused, getTicketTimeInfo());
          }
        }, 1000);
    }
  }
  
  // Add the keypress listener
  process.stdin.on('keypress', keyPressHandler);
  
  // Calculate ticket time information
  function getTicketTimeInfo() {
    // Only relevant in work mode
    if (mode !== 'work') return null;
    
    const ticketSpentMinutes = ticket.timeSpent;
    const currentSessionMinutes = totalSeconds / 60;
    const totalMinutesSpent = ticketSpentMinutes + currentSessionMinutes;
    
    const allocatedSeconds = ticket.allocatedTime * 60;
    const spentSeconds = totalMinutesSpent * 60;
    const remainingSeconds = allocatedSeconds - spentSeconds;
    
    return {
      isOvertime: remainingSeconds < 0,
      remainingSeconds: Math.abs(remainingSeconds),
      overtimeSeconds: Math.abs(remainingSeconds)
    };
  }
  
  // Initial draw
  drawTimerDisplay(timeRemaining, mode, isPaused, getTicketTimeInfo());
  
  // Timer interval - update every 500ms for smoother UI
  const timer = setInterval(() => {
    if (isPaused) return;
    
    // Calculate elapsed time based on real time
    const currentTime = Date.now();
    const elapsedMilliseconds = currentTime - startTime;
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
    
    // Update seconds only when they change
    if (elapsedSeconds > lastElapsedTime) {
      lastElapsedTime = elapsedSeconds;
      totalSeconds = elapsedSeconds;
      
      // Calculate current period duration in seconds
      let periodDuration = 0;
      if (mode === 'work') {
        periodDuration = WORK_DURATION * 60;
      } else if (mode === 'shortBreak') {
        periodDuration = SHORT_BREAK_DURATION * 60;
      } else {
        periodDuration = LONG_BREAK_DURATION * 60;
      }
      
      // Calculate remaining time in current period
      timeRemaining = Math.max(0, periodDuration - (totalSeconds % periodDuration));
      
      // Redraw every 1 second
      const now = Date.now();
      if (now - lastFullDraw >= 1000) {
        lastFullDraw = now;
        drawTimerDisplay(timeRemaining, mode, isPaused, getTicketTimeInfo());
      }
      
      // Check if current period is done
      if (timeRemaining === 0) {
        if (mode === 'work') {
          completeWorkPeriod();
        } else {
          startWorkPeriod();
        }
      }
    }
  }, 100); // Check more frequently for better accuracy
  
  // Complete work period
  function completeWorkPeriod() {
    pomodoroCount++;
    
    // Calculate actual work time (in minutes)
    const workMinutes = WORK_DURATION;
    
    // Update ticket time spent
    ticket.timeSpent += workMinutes;
    saveData();
    
    // Decide on break type
    if (pomodoroCount % POMODOROS_BEFORE_LONG_BREAK === 0) {
      mode = 'longBreak';
      console.log(chalk.blue(`\n🧘 Long Break (${LONG_BREAK_DURATION} minutes) - Relax!`));
    } else {
      mode = 'shortBreak';
      console.log(chalk.cyan(`\n☕ Short Break (${SHORT_BREAK_DURATION} minutes) - Take a breath!`));
    }
    
    // Reset timer
    totalSeconds = 0;
    lastElapsedTime = 0;
    startTime = Date.now();
    
    console.log(chalk.green(`\n✓ Work period completed! ${workMinutes} minutes added to the ticket.`));
    // Redraw after period change
    setTimeout(() => {
      drawTimerDisplay(
        mode === 'shortBreak' ? SHORT_BREAK_DURATION * 60 : LONG_BREAK_DURATION * 60, 
        mode, 
        isPaused
      );
    }, 2000);
  }
  
  // Start work period
  function startWorkPeriod() {
    mode = 'work';
    
    // Reset timer
    totalSeconds = 0;
    lastElapsedTime = 0;
    startTime = Date.now();
    
    console.log(chalk.green(`\n🍅 Starting a new ${WORK_DURATION} minute work period!`));
    // Redraw after period change
    setTimeout(() => {
      drawTimerDisplay(WORK_DURATION * 60, mode, isPaused, getTicketTimeInfo());
    }, 2000);
  }
  
  // Complete ticket
  function completeTicket() {
    cleanup();
    
    // Calculate final time in minutes (current ticket time + session time)
    const sessionMinutes = totalSeconds / 60;
    const finalTimeMinutes = ticket.timeSpent + sessionMinutes;
    
    // Update ticket
    ticket.timeSpent = Math.round(finalTimeMinutes * 10) / 10; // Round to 1 decimal place
    ticket.completed = true;
    ticket.completedAt = new Date().toISOString();
    
    // Update stats
    userData.stats.totalTicketsSolved++;
    userData.stats.totalTimeTaken += ticket.timeSpent;
    userData.stats.totalStoryPoints += ticket.storyPoints;
    
    // Calculate overtime if any
    const overtime = Math.max(0, ticket.timeSpent - ticket.allocatedTime);
    userData.stats.totalOvertime += overtime;
    
    // Update XP based on performance
    updateXP(ticket, ticket.timeSpent);
    
    // Recalculate pending stats
    calculatePendingStats();
    
    saveData();
    
    console.clear();
    console.log(chalk.bold.green('🎉 Ticket Completed!'));
    console.log(chalk.bold.white(`Ticket: ${ticket.name}`));
    console.log(chalk.blue(`Time spent: ${ticket.timeSpent} minutes`));
    console.log(chalk.blue(`Allocated time: ${ticket.allocatedTime} minutes`));
    
    if (overtime > 0) {
      console.log(chalk.yellow(`Overtime: ${overtime.toFixed(1)} minutes`));
    } else {
      console.log(chalk.green(`Completed ${Math.abs(overtime).toFixed(1)} minutes under allocated time!`));
    }
    
    // Update Jira if enabled and ticket has Jira ID
    if (config.jira?.enabled && ticket.jiraId) {
      console.log(chalk.blue('\nThis ticket is linked to Jira. Would you like to update its status in Jira?'));
      console.log(chalk.white('y.'), chalk.green('Yes, mark as Done in Jira'));
      console.log(chalk.white('n.'), chalk.yellow('No, just update locally'));
      
      rl.question(chalk.yellow('\nUpdate Jira? (y/n): '), async (answer) => {
        if (answer.toLowerCase() === 'y') {
          console.log(chalk.blue('\nUpdating Jira ticket status...'));
          
          const result = await jiraHelper.updateTicketStatus(ticket.jiraId, 'Done');
          
          if (result.success) {
            console.log(chalk.green(`\n✓ ${result.message}`));
          } else {
            console.log(chalk.red(`\n✗ Error: ${result.message}`));
          }
        }
        
        // Reset the readline interface for the confirmation prompt
        console.log(chalk.yellow('\nPress Enter to return to main menu...'));
        rl.question('', () => {
          showMainMenu();
        });
      });
    } else {
      // Reset the readline interface for the confirmation prompt
      console.log(chalk.yellow('\nPress Enter to return to main menu...'));
      rl.question('', () => {
        showMainMenu();
      });
    }
  }
  
  // Cleanup function
  function cleanup() {
    clearInterval(timer);
    process.stdin.removeListener('keypress', keyPressHandler);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  }
}

// Show dashboard
function showDashboard() {
  console.clear();
  
  try {
    const dashTitle = figlet.textSync('Dashboard', { font: 'Small' });
    console.log(chalk.bold.blue(dashTitle));
  } catch (error) {
    console.log(chalk.bold.blue('======== DASHBOARD ========'));
  }
  
  console.log(chalk.bold.cyan(`User: ${userData.user.name || 'Anonymous'}`));
  console.log(chalk.bold.cyan(`Level: ${userData.user.level} | XP: ${userData.user.xp}`));
  
  // Calculate current pending stats
  calculatePendingStats();
  
  // Display stats in a nice table
  console.log('\n' + chalk.bold.white('Statistics:'));
  console.log(chalk.cyan('╔══════════════════════════╦═══════════════╗'));
  console.log(chalk.cyan('║ ') + chalk.bold.white('Metric                  ') + chalk.cyan(' ║ ') + chalk.bold.white('Value         ') + chalk.cyan(' ║'));
  console.log(chalk.cyan('╠══════════════════════════╬═══════════════╣'));
  console.log(chalk.cyan('║ ') + chalk.white('Tickets Solved           ') + chalk.cyan(' ║ ') + chalk.green(`${userData.stats.totalTicketsSolved}`.padEnd(13)) + chalk.cyan(' ║'));
  console.log(chalk.cyan('║ ') + chalk.white('Story Points Completed   ') + chalk.cyan(' ║ ') + chalk.green(`${userData.stats.totalStoryPoints}`.padEnd(13)) + chalk.cyan(' ║'));
  console.log(chalk.cyan('║ ') + chalk.white('Total Time Taken         ') + chalk.cyan(' ║ ') + chalk.blue(`${userData.stats.totalTimeTaken.toFixed(1)} min`.padEnd(13)) + chalk.cyan(' ║'));
  console.log(chalk.cyan('║ ') + chalk.white('Total Overtime           ') + chalk.cyan(' ║ ') + chalk.yellow(`${userData.stats.totalOvertime.toFixed(1)} min`.padEnd(13)) + chalk.cyan(' ║'));
  
  if (userData.stats.totalTicketsSolved > 0) {
    const avgTime = (userData.stats.totalTimeTaken / userData.stats.totalTicketsSolved).toFixed(1);
    console.log(chalk.cyan('║ ') + chalk.white('Average Time Per Ticket   ') + chalk.cyan(' ║ ') + chalk.blue(`${avgTime} min`.padEnd(13)) + chalk.cyan(' ║'));
  }
  
  console.log(chalk.cyan('║ ') + chalk.white('Tickets Pending          ') + chalk.cyan(' ║ ') + chalk.yellow(`${userData.stats.totalTicketsPending || 0}`.padEnd(13)) + chalk.cyan(' ║'));
  console.log(chalk.cyan('║ ') + chalk.white('Story Points Pending     ') + chalk.cyan(' ║ ') + chalk.yellow(`${userData.stats.totalStoryPointsPending || 0}`.padEnd(13)) + chalk.cyan(' ║'));
  console.log(chalk.cyan('╚══════════════════════════╩═══════════════╝'));
  
  // Recent activity
  console.log('\n' + chalk.bold.white('Recent Activity:'));
  
  const recentTickets = [...userData.tickets]
    .filter(ticket => ticket.completed)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 5);
  
  if (recentTickets.length > 0) {
    console.log(chalk.cyan('╔═════╦══════════════════════╦═════╦════════════╦═════════════════════╗'));
    console.log(chalk.cyan('║ ') + chalk.bold.white('#   ') + chalk.cyan(' ║ ') + 
                chalk.bold.white('Ticket              ') + chalk.cyan(' ║ ') + 
                chalk.bold.white('SP  ') + chalk.cyan(' ║ ') + 
                chalk.bold.white('Time (min) ') + chalk.cyan(' ║ ') + 
                chalk.bold.white('Completed         ') + chalk.cyan(' ║'));
    console.log(chalk.cyan('╠═════╬══════════════════════╬═════╬════════════╬═════════════════════╣'));
    
    recentTickets.forEach((ticket, index) => {
      const num = (index + 1).toString().padEnd(3);
      const name = ticket.name.substring(0, 18).padEnd(18);
      const sp = ticket.storyPoints.toString().padEnd(3);
      const time = ticket.timeSpent.toString().padEnd(10);
      const date = new Date(ticket.completedAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).padEnd(17);
      
      console.log(chalk.cyan('║ ') + chalk.white(`${num}`) + chalk.cyan(' ║ ') + 
                  chalk.white(`${name}`) + chalk.cyan(' ║ ') + 
                  chalk.white(`${sp}`) + chalk.cyan(' ║ ') + 
                  chalk.white(`${time}`) + chalk.cyan(' ║ ') + 
                  chalk.white(`${date}`) + chalk.cyan(' ║'));
    });
    
    console.log(chalk.cyan('╚═════╩══════════════════════╩═════╩════════════╩═════════════════════╝'));
  } else {
    console.log(chalk.gray('No completed tickets yet.'));
  }
  
  console.log(chalk.gray('\nPress Enter to return to main menu...'));
  rl.question('', () => {
    showMainMenu();
  });
}

// Jira integration function
async function jiraIntegration() {
  console.clear();
  console.log(chalk.bold.blue('===== Jira Integration =====\n'));
  
  if (!config.jira?.enabled) {
    console.log(chalk.yellow('Jira integration is currently disabled in settings.'));
    console.log(chalk.yellow('Go to Settings > Jira Settings to enable it.'));
    console.log(chalk.gray('\nPress Enter to return to main menu...'));
    rl.question('', () => {
      showMainMenu();
    });
    return;
  }
  
  let isConnected = await jiraHelper.initialize();
  
  if (!isConnected) {
    console.log(chalk.yellow('Jira connection not set up. Let\'s configure it now.'));
    isConnected = await jiraHelper.setupJira(rl);
  }
  
  if (!isConnected) {
    console.log(chalk.red('\nFailed to connect to Jira.'));
    console.log(chalk.gray('\nPress Enter to return to main menu...'));
    rl.question('', () => {
      showMainMenu();
    });
    return;
  }
  
  console.log(chalk.bold.white('\nJira Options:'));
  console.log(chalk.white('1.'), chalk.green('Import Tickets from Jira'));
  console.log(chalk.white('2.'), chalk.green('Update Jira Ticket Status'));
  console.log(chalk.white('3.'), chalk.green('Setup/Change Jira Connection'));
  console.log(chalk.white('4.'), chalk.green('Return to Main Menu'));
  
  rl.question(chalk.yellow('\nSelect option: '), async (answer) => {
    switch (answer) {
      case '1':
        await importTicketsFromJira();
        break;
      case '2':
        await updateJiraTicketStatus();
        break;
      case '3':
        await jiraHelper.setupJira(rl);
        setTimeout(jiraIntegration, 1500);
        break;
      case '4':
        showMainMenu();
        break;
      default:
        console.log(chalk.red('\nInvalid option!'));
        setTimeout(jiraIntegration, 1000);
    }
  });
}

// Function to import tickets from Jira
async function importTicketsFromJira() {
  console.clear();
  console.log(chalk.bold.green('===== Import Tickets from Jira =====\n'));
  
  console.log(chalk.blue('Fetching your tickets from Jira...'));
  
  const result = await jiraHelper.getMyTickets();
  
  if (!result.success) {
    console.log(chalk.red(`\n✗ Error: ${result.message}`));
    console.log(chalk.gray('\nPress Enter to return to Jira menu...'));
    rl.question('', () => {
      jiraIntegration();
    });
    return;
  }
  
  if (result.tickets.length === 0) {
    console.log(chalk.yellow('\nNo tickets assigned to you in Jira.'));
    console.log(chalk.gray('\nPress Enter to return to Jira menu...'));
    rl.question('', () => {
      jiraIntegration();
    });
    return;
  }
  
  console.log(chalk.green(`\n✓ Found ${result.tickets.length} tickets assigned to you!\n`));
  
  // Display tickets
  console.log(chalk.bold.white('Your Jira Tickets:'));
  result.tickets.forEach((ticket, index) => {
    console.log(chalk.white(`${index + 1}.`), chalk.green(`${ticket.name}`), 
                chalk.gray(`(${ticket.type}, ${ticket.status}, SP: ${ticket.storyPoints})`));
  });
  
  // Ask which tickets to import
  console.log(chalk.bold.white('\nSelect tickets to import:'));
  console.log(chalk.white('a.'), chalk.green('Import all tickets'));
  console.log(chalk.white('s.'), chalk.green('Select specific tickets'));
  console.log(chalk.white('c.'), chalk.green('Cancel import'));
  
  rl.question(chalk.yellow('\nChoose option: '), (answer) => {
    if (answer.toLowerCase() === 'a') {
      // Import all tickets
      result.tickets.forEach(ticket => {
        const newTicket = {
          id: Date.now().toString(),
          name: ticket.name,
          jiraId: ticket.id,
          jiraUrl: ticket.jiraUrl,
          storyPoints: ticket.storyPoints,
          allocatedTime: ticket.allocatedTime,
          timeSpent: 0,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        userData.tickets.push(newTicket);
      });
      
      calculatePendingStats();
      saveData();
      console.log(chalk.green(`\n✓ Successfully imported ${result.tickets.length} tickets!`));
      
      console.log(chalk.gray('\nPress Enter to return to Jira menu...'));
      rl.question('', () => {
        jiraIntegration();
      });
    } else if (answer.toLowerCase() === 's') {
      selectTicketsToImport(result.tickets);
    } else {
      jiraIntegration();
    }
  });
}

// Function to let user select which tickets to import
function selectTicketsToImport(tickets) {
  console.clear();
  console.log(chalk.bold.green('===== Select Tickets to Import =====\n'));
  
  console.log(chalk.blue('Enter ticket numbers separated by commas (e.g., 1,3,5)'));
  console.log(chalk.blue('or ranges (e.g., 1-5) to select tickets to import.\n'));
  
  // Display tickets
  tickets.forEach((ticket, index) => {
    console.log(chalk.white(`${index + 1}.`), chalk.green(`${ticket.name}`), 
                chalk.gray(`(${ticket.type}, ${ticket.status}, SP: ${ticket.storyPoints})`));
  });
  
  rl.question(chalk.yellow('\nEnter selection: '), (answer) => {
    const selectedIndices = parseSelectionString(answer, tickets.length);
    
    if (selectedIndices.length === 0) {
      console.log(chalk.red('\nNo valid tickets selected.'));
      setTimeout(() => selectTicketsToImport(tickets), 1500);
      return;
    }
    
    const selectedTickets = selectedIndices.map(index => tickets[index]);
    
    // Import selected tickets
    selectedTickets.forEach(ticket => {
      const newTicket = {
        id: Date.now().toString(),
        name: ticket.name,
        jiraId: ticket.id,
        jiraUrl: ticket.jiraUrl,
        storyPoints: ticket.storyPoints,
        allocatedTime: ticket.allocatedTime,
        timeSpent: 0,
        completed: false,
        createdAt: new Date().toISOString()
      };
      
      userData.tickets.push(newTicket);
    });
    
    calculatePendingStats();
    saveData();
    console.log(chalk.green(`\n✓ Successfully imported ${selectedTickets.length} tickets!`));
    
    console.log(chalk.gray('\nPress Enter to return to Jira menu...'));
    rl.question('', () => {
      jiraIntegration();
    });
  });
}

// Helper function to parse selection string like "1,3,5-7"
function parseSelectionString(selectionStr, maxLength) {
  const indices = new Set();
  
  // Split by comma
  const parts = selectionStr.split(',');
  
  parts.forEach(part => {
    part = part.trim();
    
    // Check if it's a range (e.g., "1-5")
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= maxLength) {
            indices.add(i - 1); // Convert to 0-based index
          }
        }
      }
    } else {
      // Single number
      const index = parseInt(part, 10);
      if (!isNaN(index) && index > 0 && index <= maxLength) {
        indices.add(index - 1); // Convert to 0-based index
      }
    }
  });
  
  return Array.from(indices);
}

// Function to update Jira ticket status
async function updateJiraTicketStatus() {
  console.clear();
  console.log(chalk.bold.yellow('===== Update Jira Ticket Status =====\n'));
  
  // Find tickets that have Jira IDs
  const jiraTickets = userData.tickets.filter(ticket => ticket.jiraId);
  
  if (jiraTickets.length === 0) {
    console.log(chalk.yellow('No tickets linked to Jira found.'));
    console.log(chalk.gray('\nPress Enter to return to Jira menu...'));
    rl.question('', () => {
      jiraIntegration();
    });
    return;
  }
  
  console.log(chalk.blue('Select a ticket to update in Jira:'));
  jiraTickets.forEach((ticket, index) => {
    const status = ticket.completed ? chalk.green('Completed') : chalk.yellow('Pending');
    console.log(chalk.white(`${index + 1}.`), chalk.green(`${ticket.name}`), 
                chalk.gray(`(Local status: ${status})`));
  });
  
  rl.question(chalk.yellow('\nSelect ticket number or 0 to cancel: '), async (answer) => {
    const ticketIndex = parseInt(answer, 10) - 1;
    
    if (isNaN(ticketIndex) || ticketIndex < 0 || ticketIndex >= jiraTickets.length) {
      jiraIntegration();
      return;
    }
    
    const ticket = jiraTickets[ticketIndex];
    console.log(chalk.blue(`\nSelected ticket: ${ticket.name}`));
    
    console.log(chalk.bold.white('\nSelect target status:'));
    console.log(chalk.white('1.'), chalk.green('In Progress'));
    console.log(chalk.white('2.'), chalk.green('Done'));
    console.log(chalk.white('3.'), chalk.yellow('Blocked'));
    console.log(chalk.white('4.'), chalk.white('Cancel'));
    
    rl.question(chalk.yellow('\nSelect status: '), async (statusAnswer) => {
      let targetStatus;
      switch (statusAnswer) {
        case '1':
          targetStatus = 'In Progress';
          break;
        case '2':
          targetStatus = 'Done';
          break;
        case '3':
          targetStatus = 'Blocked';
          break;
        default:
          jiraIntegration();
          return;
      }
      
      console.log(chalk.blue(`\nUpdating ticket status to "${targetStatus}"...`));
      
      const result = await jiraHelper.updateTicketStatus(ticket.jiraId, targetStatus);
      
      if (result.success) {
        console.log(chalk.green(`\n✓ ${result.message}`));
        
        // If status updated to Done, also mark as completed locally
        if (targetStatus === 'Done' && !ticket.completed) {
          ticket.completed = true;
          ticket.completedAt = new Date().toISOString();
          saveData();
          console.log(chalk.green('✓ Local ticket status also updated to completed'));
        }
      } else {
        console.log(chalk.red(`\n✗ Error: ${result.message}`));
      }
      
      console.log(chalk.gray('\nPress Enter to return to Jira menu...'));
      rl.question('', () => {
        jiraIntegration();
      });
    });
  });
}

// Initialize the app
function initApp() {
  console.clear();
  console.log(chalk.bold.cyan('Starting Ticket Hero SDK...'));
  
  // Display welcome animation
  const frames = ['◐', '◓', '◑', '◒'];
  let i = 0;
  
  const loadingAnimation = setInterval(() => {
    process.stdout.write(`\r${chalk.cyan('Loading')} ${chalk.bold.yellow(frames[i])}`);
    i = (i + 1) % frames.length;
  }, 150);
  
  // Load data after a short delay to show animation
  setTimeout(() => {
    clearInterval(loadingAnimation);
    process.stdout.write('\r' + chalk.green('✓ Ready!') + ' '.repeat(20) + '\n');
    
    loadData();
    
    // Check if user profile exists
    setTimeout(() => {
      if (!userData.user.name) {
        console.clear();
        console.log(chalk.bold.magenta('===== Welcome to Ticket Hero =====\n'));
        console.log(chalk.yellow('Let\'s set up your profile first!'));
        userProfile();
      } else {
        showMainMenu();
      }
    }, 500);
  }, 1500);
}

// Make sure we handle exit properly
process.on('exit', () => {
  console.log(chalk.blue('Thank you for using Ticket Hero SDK!'));
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nExiting Ticket Hero SDK...'));
  process.exit(0);
});

// Start the app
initApp();

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    saveData,
    calculatePendingStats,
    updateXP,
    formatTime,
    addNewTicket,
    userProfile,
    editTicket,
    viewTickets
  };
}