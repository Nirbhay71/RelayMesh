import express from "express"
import { searchUsers, addContact, getContacts, getSidebar, toggleStarContact, deleteContact } from "../controllers/contact.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const ContactRouter = express.Router()

// All contact routes require authentication
ContactRouter.use(verifyJWT)

ContactRouter.get("/search", searchUsers)        // GET /contacts/search?q=...
ContactRouter.get("/sidebar", getSidebar)       // GET /contacts/sidebar
ContactRouter.post("/add", addContact)          // POST /contacts/add
ContactRouter.get("/", getContacts)             // GET /contacts
ContactRouter.patch("/:id/star", toggleStarContact) // PATCH /contacts/:id/star
ContactRouter.delete("/:id", deleteContact)     // DELETE /contacts/:id

export { ContactRouter }
