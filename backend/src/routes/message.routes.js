import express from "express"
import { getMessages, getConversationId } from "../controllers/message.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const MessageRouter = express.Router()

MessageRouter.use(verifyJWT)

MessageRouter.get("/:conversationId", getMessages)
MessageRouter.get("/conversation/:contactId", getConversationId)

export { MessageRouter }
