// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import * as os from 'os';
import * as fs from 'fs';

// Define types for the bridges
type PyOutputCallback = (data: { type: string; data: string }) => void;
type PyStartedCallback = () => void;
type PyReadyCallback = (url: string) => void;
type ChromeOutputCallback = (data: { type: string; data: string }) => void;
type ChromeStartedCallback = () => void;
type SettingsCallback = (settings: Record<string, any>) => void;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('pyBridge', {
  // Listen for messages from the main process
  onPyOutput: (callback: PyOutputCallback) => {
    ipcRenderer.on('py-output', (_, data) => callback(data));
  },
  
  onPyStarted: (callback: PyStartedCallback) => {
    ipcRenderer.on('py-started', () => callback());
  },
  
  onPyReady: (callback: PyReadyCallback) => {
    ipcRenderer.on('py-ready', (_, url) => callback(url));
  },
  
  // Restart the Python process
  restartPython: () => {
    ipcRenderer.send('restart-python');
  },
  
  // Clean up event listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('py-output');
    ipcRenderer.removeAllListeners('py-started');
    ipcRenderer.removeAllListeners('py-ready');
  }
});

// Expose Chrome bridge for communicating Chrome process information
contextBridge.exposeInMainWorld('chromeBridge', {
  // Listen for messages from the main process
  onChromeOutput: (callback: ChromeOutputCallback) => {
    ipcRenderer.on('chrome-output', (_, data) => callback(data));
  },
  
  onChromeStarted: (callback: ChromeStartedCallback) => {
    ipcRenderer.on('chrome-started', () => callback());
  },
  
  // Restart the Chrome process
  restartChrome: () => {
    ipcRenderer.send('restart-chrome');
  },
  
  // Clean up event listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('chrome-output');
    ipcRenderer.removeAllListeners('chrome-started');
  }
});

// Expose settings bridge for handling default settings
contextBridge.exposeInMainWorld('settingsBridge', {
  // Listen for default settings from the main process
  onDefaultSettings: (callback: SettingsCallback) => {
    ipcRenderer.on('load-default-settings', (_, settings) => callback(settings));
  },
  
  // Clean up event listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('load-default-settings');
  }
});

// Expose Node.js platform-specific APIs needed by the renderer
contextBridge.exposeInMainWorld('nodeAPI', {
  platform: os.platform(),
  homedir: os.homedir(),
  env: {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    LOCALAPPDATA: process.env.LOCALAPPDATA
  },
  pathSep: process.platform === 'win32' ? '\\' : '/'
});

