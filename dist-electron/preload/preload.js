"use strict";
const electron = require("electron");
const api = {
  assets: {
    list: (filters) => electron.ipcRenderer.invoke("assets:list", { filters }),
    get: (id) => electron.ipcRenderer.invoke("assets:get", { id }),
    create: (input) => electron.ipcRenderer.invoke("assets:create", input),
    update: (id, data) => electron.ipcRenderer.invoke("assets:update", { id, data }),
    delete: (id) => electron.ipcRenderer.invoke("assets:delete", { id }),
    assignedNames: () => electron.ipcRenderer.invoke("assets:assignedNames"),
    resguardo: (id) => electron.ipcRenderer.invoke("assets:resguardo", { id })
  },
  movimientos: {
    list: (filters) => electron.ipcRenderer.invoke("movimientos:list", filters),
    create: (input) => electron.ipcRenderer.invoke("movimientos:create", input)
  },
  areas: {
    list: (unidad) => electron.ipcRenderer.invoke("areas:list", { unidad }),
    ensure: (nombre, unidad) => electron.ipcRenderer.invoke("areas:ensure", { nombre, unidad }),
    getAreasUnicas: (unidad) => electron.ipcRenderer.invoke("db:getAreasUnicas", { unidad })
  }
};
electron.contextBridge.exposeInMainWorld("camaf", api);
