"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profilesController_1 = require("../controllers/profilesController");
const route = (0, express_1.Router)();
route.get("/", profilesController_1.getAllProfiles);
exports.default = route;
