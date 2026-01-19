import Router from 'express'
import { FriendsController } from './friends.controller'
import { supabaseAuth } from '../auth/auth.middleware'

const friendsRoutes = Router()

friendsRoutes.post('/requests/:profileId', supabaseAuth, FriendsController.sendFriendRequest)
friendsRoutes.post('/requests/:requestId/accept', FriendsController.acceptFriendRequest)
friendsRoutes.post('/requests/:requestId/decline', FriendsController.declineFriendRequest)




friendsRoutes.delete('/requests/:profileId', FriendsController.cancelFriendRequest)
friendsRoutes.delete('/:profileId', FriendsController.unfriend)

friendsRoutes.get('/:profileId/count', FriendsController.getFriendsCount)
friendsRoutes.get('/:profileId', FriendsController.getFriends)





export default friendsRoutes