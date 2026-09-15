import express from "express"
import { getMessages, getConversationId, getConversations } from "../controllers/message.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const MessageRouter = express.Router()

MessageRouter.use(verifyJWT)

// Specific routes must come before the "/:conversationId" catch-all
MessageRouter.get("/conversations/list", getConversations)
MessageRouter.get("/conversation/:contactId", getConversationId)
MessageRouter.get("/:conversationId", getMessages)

export { MessageRouter }
