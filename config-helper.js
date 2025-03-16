// config-helper.js
const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(__dirname, 'config.default.json');
const USER_CONFIG_PATH = path.join(__dirname, 'config.json');

/**
 * Loads and merges configuration from default and user config files
 * @returns {Object} The merged configuration
 */
function loadConfig() {
  // Load default config
  let defaultConfig = {};
  try {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      const defaultConfigData = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
      defaultConfig = JSON.parse(defaultConfigData);
    } else {
      console.warn('Default config file not found. Using empty default config.');
    }
  } catch (error) {
    console.error('Error loading default config:', error);
  }

  // Load user config if it exists
  let userConfig = {};
  try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
      const userConfigData = fs.readFileSync(USER_CONFIG_PATH, 'utf8');
      userConfig = JSON.parse(userConfigData);
    }
  } catch (error) {
    console.error('Error loading user config:', error);
  }

  // Merge configs with user config taking precedence
  const mergedConfig = deepMerge(defaultConfig, userConfig);
  
  // Validate config values
  return validateConfig(mergedConfig);
}

/**
 * Saves the configuration to the user config file
 * @param {Object} config - The configuration to save
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('Configuration saved successfully');
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
}

/**
 * Deep merges two objects
 * @param {Object} target - The target object
 * @param {Object} source - The source object
 * @returns {Object} The merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

/**
 * Checks if a value is an object
 * @param {*} item - The item to check
 * @returns {boolean} True if the item is an object
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Validates configuration values and sets defaults for invalid values
 * @param {Object} config - The configuration to validate
 * @returns {Object} The validated configuration
 */
function validateConfig(config) {
  const validated = { ...config };
  
  // Default config structure if missing
  if (!validated.pomodoro) validated.pomodoro = {};
  if (!validated.xp) validated.xp = {};
  if (!validated.app) validated.app = {};
  if (!validated.ui) validated.ui = {};
  
  // Validate pomodoro settings
  validated.pomodoro.workDuration = validatePositiveNumber(
    validated.pomodoro.workDuration, 25);
  validated.pomodoro.shortBreakDuration = validatePositiveNumber(
    validated.pomodoro.shortBreakDuration, 5);
  validated.pomodoro.longBreakDuration = validatePositiveNumber(
    validated.pomodoro.longBreakDuration, 15);
  validated.pomodoro.longBreakInterval = validatePositiveNumber(
    validated.pomodoro.longBreakInterval, 4);
  validated.pomodoro.autoStartBreaks = typeof validated.pomodoro.autoStartBreaks === 'boolean'
    ? validated.pomodoro.autoStartBreaks : true;
  validated.pomodoro.autoStartPomodoros = typeof validated.pomodoro.autoStartPomodoros === 'boolean'
    ? validated.pomodoro.autoStartPomodoros : false;
  
  // Validate XP settings
  validated.xp.baseXpPerStoryPoint = validatePositiveNumber(
    validated.xp.baseXpPerStoryPoint, 10);
  validated.xp.earlyCompletionBonusPercent = validatePositiveNumber(
    validated.xp.earlyCompletionBonusPercent, 20);
  validated.xp.xpLevelThresholdMultiplier = validatePositiveNumber(
    validated.xp.xpLevelThresholdMultiplier, 100);
  
  // Validate app settings
  validated.app.dataFile = typeof validated.app.dataFile === 'string'
    ? validated.app.dataFile : 'ticket-hero-data.json';
  validated.app.backupFrequencyInHours = validatePositiveNumber(
    validated.app.backupFrequencyInHours, 24);
  validated.app.maxBackups = validatePositiveNumber(
    validated.app.maxBackups, 5);
  
  // Validate UI settings
  validated.ui.colorTheme = typeof validated.ui.colorTheme === 'string'
    ? validated.ui.colorTheme : 'default';
  validated.ui.useEmojis = typeof validated.ui.useEmojis === 'boolean'
    ? validated.ui.useEmojis : true;
  validated.ui.showProgressBar = typeof validated.ui.showProgressBar === 'boolean'
    ? validated.ui.showProgressBar : true;
  
  return validated;
}

/**
 * Validates that a value is a positive number
 * @param {*} value - The value to validate
 * @param {number} defaultValue - The default value to use if invalid
 * @returns {number} The validated value
 */
function validatePositiveNumber(value, defaultValue) {
  const num = Number(value);
  return (!isNaN(num) && num > 0) ? num : defaultValue;
}

module.exports = {
  loadConfig,
  saveConfig
};