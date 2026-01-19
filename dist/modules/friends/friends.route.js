"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const friends_controller_1 = require("./friends.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const friendsRoutes = (0, express_1.default)();
friendsRoutes.post('/requests/:profileId', auth_middleware_1.supabaseAuth, friends_controller_1.FriendsController.sendFriendRequest);
friendsRoutes.post('/requests/:requestId/accept', friends_controller_1.FriendsController.acceptFriendRequest);
friendsRoutes.post('/requests/:requestId/decline', friends_controller_1.FriendsController.declineFriendRequest);
friendsRoutes.delete('/requests/:profileId', friends_controller_1.FriendsController.cancelFriendRequest);
friendsRoutes.delete('/:profileId', friends_controller_1.FriendsController.unfriend);
friendsRoutes.get('/:profileId/count', friends_controller_1.FriendsController.getFriendsCount);
friendsRoutes.get('/:profileId', friends_controller_1.FriendsController.getFriends);
exports.default = friendsRoutes;
