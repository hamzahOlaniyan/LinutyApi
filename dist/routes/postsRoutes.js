"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postsController_1 = require("../controllers/postsController");
const route = (0, express_1.Router)();
route.get("/", postsController_1.getAllPost);
route.get("/:id", postsController_1.getPostById);
exports.default = route;
