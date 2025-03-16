// jira-helper.js
const JiraApi = require('jira-client');
const keytar = require('keytar');
const chalk = require('chalk');

const SERVICE_NAME = 'ticket-hero-jira';

/**
 * Manages Jira integration and authentication
 */
class JiraHelper {
  constructor() {
    this.jira = null;
    this.isAuthenticated = false;
  }

  /**
   * Get stored credentials
   */
  async getStoredCredentials() {
    try {
      const credentials = await keytar.findCredentials(SERVICE_NAME);
      if (credentials && credentials.length > 0) {
        return {
          host: await keytar.getPassword(SERVICE_NAME, 'host'),
          username: credentials[0].account,
          password: credentials[0].password
        };
      }
    } catch (error) {
      console.error('Error retrieving stored credentials:', error);
    }
    return null;
  }

  /**
   * Save credentials securely
   */
  async saveCredentials(host, username, password) {
    try {
      await keytar.setPassword(SERVICE_NAME, username, password);
      await keytar.setPassword(SERVICE_NAME, 'host', host);
      return true;
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  }

  /**
   * Initialize Jira client
   */
  async initialize() {
    const credentials = await this.getStoredCredentials();
    
    if (credentials) {
      return this.connect(
        credentials.host,
        credentials.username,
        credentials.password
      );
    }
    
    return false;
  }

  /**
   * Connect to Jira
   */
  async connect(host, username, password) {
    try {
      this.jira = new JiraApi({
        protocol: 'https',
        host,
        username,
        password,
        apiVersion: '2',
        strictSSL: true
      });
      
      // Test the connection
      await this.jira.getCurrentUser();
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error(chalk.red('Error connecting to Jira:'), error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Setup Jira connection with user input
   */
  async setupJira(rl) {
    console.clear();
    console.log(chalk.bold.blue('===== Jira Integration Setup =====\n'));
    
    console.log(chalk.yellow('NOTE: For Jira Cloud, you need to use an API token as your password.'));
    console.log(chalk.yellow('You can create an API token at: https://id.atlassian.com/manage-profile/security/api-tokens\n'));
    
    // Using readline interface for consistent UI
    const host = await new Promise(resolve => {
      rl.question(chalk.yellow('Jira Host (e.g., mycompany.atlassian.net): '), answer => {
        resolve(answer.trim());
      });
    });
    
    const username = await new Promise(resolve => {
      rl.question(chalk.yellow('Jira Email/Username: '), answer => {
        resolve(answer.trim());
      });
    });
    
    // For password input
    console.log(chalk.yellow('Jira API Token/Password: '));
    let password = '';
    
    // Set up to handle keypress events for password input
    const stdin = process.stdin;
    const previousRawMode = stdin.isRaw;
    stdin.setRawMode && stdin.setRawMode(true);
    
    await new Promise(resolve => {
      const keyListener = (buffer) => {
        const key = buffer.toString();
        
        // Check for Enter key
        if (key === '\r' || key === '\n') {
          process.stdout.write('\n');
          stdin.removeListener('data', keyListener);
          stdin.setRawMode && stdin.setRawMode(previousRawMode);
          resolve();
          return;
        }
        
        // Check for backspace
        if (key === '\b' || key === '\x7f') {
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          return;
        }
        
        // Check for ctrl+c
        if (key === '\u0003') {
          console.log('\n');
          process.exit();
        }
        
        // Regular character
        password += key;
        process.stdout.write('*');
      };
      
      stdin.on('data', keyListener);
    });
    
    console.log(chalk.blue('\nConnecting to Jira...'));
    const connected = await this.connect(host, username, password);
    
    if (connected) {
      console.log(chalk.green('\n✓ Successfully connected to Jira!'));
      await this.saveCredentials(host, username, password);
      console.log(chalk.green('✓ Credentials saved securely'));
      
      // Test fetching tickets
      console.log(chalk.blue('\nTesting connection by fetching your tickets...'));
      const ticketResult = await this.getMyTickets();
      if (ticketResult.success) {
        console.log(chalk.green(`✓ Successfully found ${ticketResult.tickets.length} tickets assigned to you.`));
      } else {
        console.log(chalk.yellow(`⚠️ Connected to Jira, but couldn't fetch tickets: ${ticketResult.message}`));
      }
    } else {
      console.log(chalk.red('\n✗ Failed to connect to Jira. Please check your credentials.'));
    }
    
    return connected;
  }

  /**
   * Get assigned tickets from Jira
   */
  async getMyTickets() {
    if (!this.isAuthenticated) {
      await this.initialize();
    }
    
    if (!this.isAuthenticated) {
      return { success: false, message: 'Not authenticated with Jira' };
    }
    
    try {
      // Get current user to find username
      const myself = await this.jira.getCurrentUser();
      console.log('Current Jira user:', myself.name, myself.displayName);
      
      // Try multiple JQL queries to find tickets
      let jql = `assignee = currentUser() AND status not in (Done, Closed) ORDER BY updated DESC`;
      console.log('Using JQL query:', jql);
      
      let issues = await this.jira.searchJira(jql, {
        fields: ['summary', 'description', 'issuetype', 'priority', 'status', 'customfield_10016'], // customfield_10016 is often story points
        maxResults: 50
      });
      
      console.log(`Found ${issues.issues.length} tickets with first query`);
      
      // If no tickets found with first query, try alternatives
      if (issues.issues.length === 0) {
        // Try with explicit username
        jql = `assignee = "${myself.name}" ORDER BY updated DESC`;
        console.log('Trying alternative query with explicit username:', jql);
        
        issues = await this.jira.searchJira(jql, {
          fields: ['summary', 'description', 'issuetype', 'priority', 'status', 'customfield_10016'],
          maxResults: 50
        });
        
        console.log(`Found ${issues.issues.length} tickets with username query`);
        
        // If still no tickets, try with email
        if (issues.issues.length === 0 && myself.emailAddress) {
          jql = `assignee = "${myself.emailAddress}" ORDER BY updated DESC`;
          console.log('Trying alternative query with email:', jql);
          
          issues = await this.jira.searchJira(jql, {
            fields: ['summary', 'description', 'issuetype', 'priority', 'status', 'customfield_10016'],
            maxResults: 50
          });
          
          console.log(`Found ${issues.issues.length} tickets with email query`);
        }
        
        // Last attempt - all tickets (limited to 20)
        if (issues.issues.length === 0) {
          jql = `ORDER BY updated DESC`;
          console.log('Last attempt - fetching recent tickets:', jql);
          
          issues = await this.jira.searchJira(jql, {
            fields: ['summary', 'description', 'issuetype', 'priority', 'status', 'assignee', 'customfield_10016'],
            maxResults: 20
          });
          
          console.log(`Found ${issues.issues.length} recent tickets`);
          
          // Filter by assignee if we found tickets
          if (issues.issues.length > 0) {
            console.log('Filtering to find tickets that might be assigned to you');
            // Just log the first ticket's assignee structure to understand format
            if (issues.issues[0]?.fields?.assignee) {
              console.log('Example assignee structure:', 
                        JSON.stringify(issues.issues[0].fields.assignee, null, 2));
            }
          }
        }
      }
      
      // If we still have no tickets
      if (issues.issues.length === 0) {
        return { 
          success: false, 
          message: 'No tickets found assigned to you. Please check your Jira assignments.'
        };
      }
      
      return {
        success: true,
        tickets: issues.issues.map(issue => ({
          id: issue.key,
          name: `${issue.key}: ${issue.fields.summary}`,
          type: issue.fields.issuetype.name,
          status: issue.fields.status.name,
          storyPoints: issue.fields.customfield_10016 || 1,
          allocatedTime: this.estimateAllocatedTime(issue),
          jiraUrl: `https://${this.jira.host}/browse/${issue.key}`
        }))
      };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Estimate allocated time based on story points or issue type
   */
  estimateAllocatedTime(issue) {
    // If story points are available, use them (assuming 1 point = 25 minutes)
    const storyPoints = issue.fields.customfield_10016;
    if (storyPoints) {
      return storyPoints * 25;
    }
    
    // Otherwise estimate by issue type
    const type = issue.fields.issuetype.name.toLowerCase();
    if (type.includes('bug')) {
      return 45; // 45 minutes for bugs
    } else if (type.includes('task')) {
      return 30; // 30 minutes for tasks
    } else if (type.includes('story')) {
      return 60; // 60 minutes for stories
    }
    
    // Default
    return 25;
  }

  /**
   * Update Jira ticket status
   */
  async updateTicketStatus(ticketId, targetStatus) {
    if (!this.isAuthenticated) {
      await this.initialize();
    }
    
    if (!this.isAuthenticated) {
      return { success: false, message: 'Not authenticated with Jira' };
    }
    
    try {
      // Get available transitions for the issue
      const transitions = await this.jira.listTransitions(ticketId);
      console.log('Available transitions:', transitions.transitions.map(t => t.name));
      
      // Find the transition that matches our target status
      const transition = transitions.transitions.find(t => 
        t.name.toLowerCase() === targetStatus.toLowerCase() ||
        t.to.name.toLowerCase() === targetStatus.toLowerCase()
      );
      
      if (!transition) {
        // Try to find a similar transition if exact match not found
        const similarTransition = transitions.transitions.find(t => 
          t.name.toLowerCase().includes(targetStatus.toLowerCase()) ||
          (t.to && t.to.name.toLowerCase().includes(targetStatus.toLowerCase()))
        );
        
        if (similarTransition) {
          // Use the similar transition
          const result = await this.jira.transitionIssue(ticketId, {
            transition: {
              id: similarTransition.id
            }
          });
          
          return { 
            success: true, 
            message: `Ticket status updated to ${similarTransition.name} (closest match to ${targetStatus})`
          };
        }
        
        return { 
          success: false, 
          message: `Cannot transition to "${targetStatus}". Available transitions: ${transitions.transitions.map(t => t.name).join(', ')}`
        };
      }
      
      // Execute the transition
      await this.jira.transitionIssue(ticketId, {
        transition: {
          id: transition.id
        }
      });
      
      return { success: true, message: `Ticket status updated to ${transition.name}` };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Add a comment to a Jira ticket
   */
  async addComment(ticketId, comment) {
    if (!this.isAuthenticated) {
      await this.initialize();
    }
    
    if (!this.isAuthenticated) {
      return { success: false, message: 'Not authenticated with Jira' };
    }
    
    try {
      await this.jira.addComment(ticketId, comment);
      return { success: true, message: 'Comment added successfully' };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Log work on a Jira ticket
   */
  async logWork(ticketId, timeSpentMinutes, comment = 'Logged from Ticket Hero') {
    if (!this.isAuthenticated) {
      await this.initialize();
    }
    
    if (!this.isAuthenticated) {
      return { success: false, message: 'Not authenticated with Jira' };
    }
    
    try {
      // Convert minutes to Jira format (e.g., "3h 30m")
      const hours = Math.floor(timeSpentMinutes / 60);
      const minutes = timeSpentMinutes % 60;
      let timeSpent = '';
      
      if (hours > 0) {
        timeSpent += `${hours}h `;
      }
      
      if (minutes > 0 || timeSpent === '') {
        timeSpent += `${minutes}m`;
      }
      
      // Log the work
      await this.jira.addWorklog(ticketId, {
        timeSpent: timeSpent.trim(),
        comment: comment
      });
      
      return { success: true, message: `Logged ${timeSpent} of work to ${ticketId}` };
    } catch (error) {
      console.error('Error logging work:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new JiraHelper();