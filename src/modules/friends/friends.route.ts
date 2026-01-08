import Router from 'express'
import { FriendsController } from './friends.controller'
import { supabaseAuth } from '../auth/auth.middleware'

const router = Router()

router.post('/requests/:profileId', supabaseAuth, FriendsController.sendFriendRequest)
router.post('/requests/:requestId/accept', FriendsController.acceptFriendRequest)
router.post('/requests/:requestId/decline', FriendsController.declineFriendRequest)




router.delete('/requests/:profileId', FriendsController.cancelFriendRequest)
router.delete('/:profileId', FriendsController.unfriend)

router.get('/:profileId/count', FriendsController.getFriendsCount)
router.get('/:profileId', FriendsController.getFriends)





export default router