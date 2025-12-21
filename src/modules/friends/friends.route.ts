import Router from 'express'
import { FriendsController } from './friends.controller'

const router = Router()

router.post('/requests/:profileId', FriendsController.sendFriendRequest)
router.post('/requests/:requestId/accept', FriendsController.acceptFriendRequest)
router.post('/requests/:requestId/decline', FriendsController.declineFriendRequest)


router.delete('/requests/:profileId', FriendsController.cancelFriendRequest)
router.delete('/:profileId', FriendsController.unfriend)




export default router