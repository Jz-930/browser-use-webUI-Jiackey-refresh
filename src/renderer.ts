/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 */

import './index.css';
import { pythonCommand, chromeCommand } from './config';

// Define interface for Python bridge
interface PyBridge {
  onPyOutput: (callback: (data: { type: string; data: string }) => void) => void;
  onPyStarted: (callback: () => void) => void;
  onPyReady: (callback: (url: string) => void) => void;
  restartPython: () => void;
  removeAllListeners: () => void;
}

// Define interface for Chrome bridge
interface ChromeBridge {
  onChromeOutput: (callback: (data: { type: string; data: string }) => void) => void;
  onChromeStarted: (callback: () => void) => void;
  restartChrome: () => void;
  removeAllListeners: () => void;
}

// Access the exposed API from preload script
declare global {
  interface Window {
    pyBridge: PyBridge;
    chromeBridge: ChromeBridge;
    settingsBridge: {
      onDefaultSettings: (callback: (settings: any) => void) => void;
    };
  }
}

// DOM Elements
const consoleOutput = document.getElementById('console-output') as HTMLDivElement;
const consoleContent = document.getElementById('console-content') as HTMLDivElement;
const chromeConsoleContent = document.getElementById('chrome-console-content') as HTMLDivElement;
const loadingProgress = document.getElementById('loading-progress') as HTMLDivElement;
const loadingContainer = document.getElementById('loading-container') as HTMLDivElement;
const webviewContainer = document.getElementById('webview-container') as HTMLDivElement;
const webview = document.getElementById('webview') as HTMLElement;
const launchButton = document.getElementById('launch-button') as HTMLButtonElement;
const controls = document.getElementById('controls') as HTMLDivElement;
const toggleConsoleButton = document.getElementById('toggle-console') as HTMLButtonElement;
const closeConsoleButton = document.getElementById('close-console') as HTMLSpanElement;
const tabPython = document.getElementById('tab-python') as HTMLButtonElement;
const tabChrome = document.getElementById('tab-chrome') as HTMLButtonElement;
const restartPythonButton = document.getElementById('restart-python') as HTMLButtonElement;
const restartChromeButton = document.getElementById('restart-chrome') as HTMLButtonElement;
const pythonCommandDisplay = document.getElementById('python-command') as HTMLDivElement;
const chromeCommandDisplay = document.getElementById('chrome-command') as HTMLDivElement;
const actionRows = document.querySelectorAll('.action-row') as NodeListOf<HTMLDivElement>;

// Variables to track loading
let progressValue = 0;
let progressInterval: number | null = null;
let serverUrl = '';

// Function to append output to the console
function appendToConsole(message: string, type: string, target: HTMLElement = consoleContent): void {
  const element = document.createElement('div');
  element.className = type;
  element.textContent = message;
  target.appendChild(element);
  target.scrollTop = target.scrollHeight;
}

// Function to simulate loading progress
function simulateProgress(): void {
  progressInterval = window.setInterval(() => {
    if (progressValue < 90) {
      progressValue += Math.random() * 10;
      loadingProgress.style.width = `${progressValue}%`;
    }
  }, 300);
}

// Function to complete the loading progress
function completeProgress(): void {
  clearInterval(progressInterval!);
  progressValue = 100;
  loadingProgress.style.width = '100%';
  
  // Hide loading container after a short delay
  setTimeout(() => {
    loadingContainer.style.display = 'none';
    // Don't show the launch button if we're auto-loading the UI
    if (!serverUrl) {
      launchButton.style.display = 'block';
    }
  }, 500);
}

// Toggle console visibility
function toggleConsole(): void {
  // Use classList to toggle visibility
  const isConsoleVisible = consoleOutput.classList.contains('visible');
  
  if (isConsoleVisible) {
    consoleOutput.classList.remove('visible');
    toggleConsoleButton.textContent = 'Show Console';
  } else {
    consoleOutput.classList.add('visible');
    toggleConsoleButton.textContent = 'Hide Console';
    // Scroll to the latest output
    const activeTab = tabPython.classList.contains('active') ? consoleContent : chromeConsoleContent;
    activeTab.scrollTop = activeTab.scrollHeight;
  }
}

// Function to switch between console tabs
function switchConsoleTab(tab: 'python' | 'chrome'): void {
  if (tab === 'python') {
    tabPython.classList.add('active');
    tabChrome.classList.remove('active');
    consoleContent.style.display = 'block';
    chromeConsoleContent.style.display = 'none';
    consoleContent.scrollTop = consoleContent.scrollHeight;
    // Show Python action row, hide Chrome action row
    actionRows[0].style.display = 'flex';
    actionRows[1].style.display = 'none';
  } else {
    tabPython.classList.remove('active');
    tabChrome.classList.add('active');
    consoleContent.style.display = 'none';
    chromeConsoleContent.style.display = 'block';
    chromeConsoleContent.scrollTop = chromeConsoleContent.scrollHeight;
    // Hide Python action row, show Chrome action row
    actionRows[0].style.display = 'none';
    actionRows[1].style.display = 'flex';
  }
}

// Function to load the web UI
function loadWebUI(url: string): void {
  // Force the correct type for webview element
  const webviewElement = document.querySelector('webview') as Electron.WebviewTag;
  if (webviewElement) {
    webviewElement.src = url;
    
    // Handle webview events
    webviewElement.addEventListener('dom-ready', () => {
      console.log('WebView DOM ready');
    });
    
    webviewElement.addEventListener('did-start-loading', () => {
      console.log('WebView started loading');
    });
    
    webviewElement.addEventListener('did-finish-load', () => {
      console.log('WebView finished loading');
      // Remove loading class when webview is loaded
      document.body.classList.remove('loading');
    });
    
    webviewElement.addEventListener('did-fail-load', (e) => {
      console.error('WebView failed to load:', e);
      // Show error and console if webview fails to load
      appendToConsole(`Failed to load webview: ${JSON.stringify(e)}`, 'error');
      consoleOutput.classList.add('visible');
      toggleConsoleButton.textContent = 'Hide Console';
      // Scroll to the error
      consoleContent.scrollTop = consoleContent.scrollHeight;
    });
  }
  
  // Show the webview and controls, hide other elements
  webviewContainer.style.display = 'block';
  controls.style.display = 'block';
  loadingContainer.style.display = 'none';
  launchButton.style.display = 'none';
  
  // Keep console visible until the UI fully loads, then hide it with a delay
  // This is handled in the event listeners in the init function
}

// Initialize the app
function init(): void {
  // Start simulating progress
  simulateProgress();
  
  // Show console automatically during loading
  consoleOutput.classList.add('visible');
  
  // Set the command displays
  pythonCommandDisplay.textContent = pythonCommand.display;
  chromeCommandDisplay.textContent = chromeCommand.display;
  
  // Listen for Python process output
  window.pyBridge.onPyOutput((data) => {
    appendToConsole(data.data, data.type);
    
    // Automatically detect when server is ready from the output
    if (data.data.includes('Server is ready') || data.data.includes('Running on http://')) {
      if (!serverUrl) {
        serverUrl = 'http://127.0.0.1:7788';
        appendToConsole(`Detected server is ready at: ${serverUrl}`, 'info');
        completeProgress();
        loadWebUI(serverUrl);
        
        // Hide console after server is ready and web UI is loaded
        setTimeout(() => {
          consoleOutput.classList.remove('visible');
          toggleConsoleButton.textContent = 'Show Console';
        }, 1000); // Small delay to allow users to see the "Server is ready" message
      }
    }
  });
  
  // Listen for Python process started event
  window.pyBridge.onPyStarted(() => {
    appendToConsole('Python process started', 'info');
  });
  
  // Listen for Python ready event
  window.pyBridge.onPyReady((url) => {
    serverUrl = url;
    appendToConsole(`Server is ready at: ${url}`, 'info');
    completeProgress();
    // Automatically load the web UI
    loadWebUI(url);
    
    // Hide console after server is ready and web UI is loaded
    setTimeout(() => {
      consoleOutput.classList.remove('visible');
      toggleConsoleButton.textContent = 'Show Console';
    }, 1000); // Small delay to allow users to see the "Server is ready" message
  });
  
  // Listen for Chrome process output
  window.chromeBridge.onChromeOutput((data) => {
    appendToConsole(data.data, data.type, chromeConsoleContent);
  });
  
  // Listen for Chrome process started event
  window.chromeBridge.onChromeStarted(() => {
    appendToConsole('Chrome process started', 'info', chromeConsoleContent);
  });
  
  // Setup tab switching
  tabPython.addEventListener('click', () => {
    switchConsoleTab('python');
    restartPythonButton.style.display = 'block';
    restartChromeButton.style.display = 'none';
  });
  
  tabChrome.addEventListener('click', () => {
    switchConsoleTab('chrome');
    restartPythonButton.style.display = 'none';
    restartChromeButton.style.display = 'block';
  });
  
  // Setup restart buttons
  restartPythonButton.addEventListener('click', () => {
    // Clear console
    consoleContent.innerHTML = '';
    
    // Add message about restart
    appendToConsole('Restarting Python process...', 'info');
    
    // Restart the process
    window.pyBridge.restartPython();
  });
  
  restartChromeButton.addEventListener('click', () => {
    // Clear console
    chromeConsoleContent.innerHTML = '';
    
    // Add message about restart
    appendToConsole('Restarting Chrome process...', 'info', chromeConsoleContent);
    
    // Restart the process
    window.chromeBridge.restartChrome();
  });
  
  // Setup launch button click handler
  launchButton.addEventListener('click', () => {
    loadWebUI(serverUrl);
  });
  
  // Setup toggle console button
  toggleConsoleButton.addEventListener('click', toggleConsole);
  
  // Setup close console button
  closeConsoleButton.addEventListener('click', () => {
    consoleOutput.classList.remove('visible');
    toggleConsoleButton.textContent = 'Show Console';
  });
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Clean up event listeners when window is closed
window.addEventListener('beforeunload', () => {
  window.pyBridge.removeAllListeners();
  window.chromeBridge.removeAllListeners();
  if (progressInterval) {
    clearInterval(progressInterval);
  }
});
