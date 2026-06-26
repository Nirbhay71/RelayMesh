import express from "express"
import { addContact, getContacts, deleteContact } from "../controllers/contact.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const ContactRouter = express.Router()

// All contact routes require authentication
ContactRouter.use(verifyJWT)

ContactRouter.post("/add", addContact)          // POST /contacts/add
ContactRouter.get("/", getContacts)             // GET /contacts
ContactRouter.delete("/:id", deleteContact)     // DELETE /contacts/:id

export { ContactRouter }
