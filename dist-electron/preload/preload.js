"use strict";
const electron = require("electron");
const api = {
  auth: {
    login: (input) => electron.ipcRenderer.invoke("auth:login", input),
    logout: () => electron.ipcRenderer.invoke("auth:logout"),
    me: () => electron.ipcRenderer.invoke("auth:me")
  },
  assets: {
    list: (filters) => electron.ipcRenderer.invoke("assets:list", { filters }),
    get: (id) => electron.ipcRenderer.invoke("assets:get", { id }),
    create: (input) => electron.ipcRenderer.invoke("assets:create", input),
    update: (id, data) => electron.ipcRenderer.invoke("assets:update", { id, data }),
    delete: (id) => electron.ipcRenderer.invoke("assets:delete", { id }),
    resguardo: (id) => electron.ipcRenderer.invoke("assets:resguardo", { id })
  },
  users: {
    list: () => electron.ipcRenderer.invoke("users:list"),
    create: (input) => electron.ipcRenderer.invoke("users:create", input),
    update: (id, data) => electron.ipcRenderer.invoke("users:update", { id, data }),
    delete: (id) => electron.ipcRenderer.invoke("users:delete", { id })
  },
  movimientos: {
    list: (filters) => electron.ipcRenderer.invoke("movimientos:list", filters),
    create: (input) => electron.ipcRenderer.invoke("movimientos:create", input)
  },
  areas: {
    list: () => electron.ipcRenderer.invoke("areas:list")
  }
};
electron.contextBridge.exposeInMainWorld("camaf", api);
