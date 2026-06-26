import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { ApiError } from "../utils/ApiError.js"
import { ContactModel } from "../models/contact.model.js"
import { UserModel } from "../models/user.models.js"
import { isUserOnline } from "../utils/redis.utils.js"

// ─────────────────────────────────────────────────
// POST /contacts/add
// Adds a contact — requires BOTH username AND email to match
// the same User document in the database
// ─────────────────────────────────────────────────
const addContact = asyncHandler(async (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        throw new ApiError(400, "Both username and email are required");
    }

    // Find a user where BOTH username and email match
    const targetUser = await UserModel.findOne({
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
    });

    if (!targetUser) {
        throw new ApiError(404, "No user found with this username and email combination");
    }

    // Prevent adding yourself as a contact
    if (targetUser._id.toString() === req.user._id.toString()) {
        throw new ApiError(400, "You cannot add yourself as a contact");
    }

    // Check if contact already exists
    const existingContact = await ContactModel.findOne({
        owner: req.user._id,
        contact: targetUser._id,
    });

    if (existingContact) {
        throw new ApiError(409, "This user is already in your contacts");
    }

    const newContact = await ContactModel.create({
        owner: req.user._id,
        contact: targetUser._id,
    });

    // Populate the contact's user details before returning
    const populatedContact = await ContactModel.findById(newContact._id)
        .populate("contact", "username email avatar bio");

    const contactObj = populatedContact.toObject();
    contactObj.contact.isOnline = await isUserOnline(targetUser._id.toString());

    return res.status(201).json(
        new ApiResponce(201, contactObj, "Contact added successfully")
    );
})

// ─────────────────────────────────────────────────
// GET /contacts
// Returns all contacts belonging to the logged-in user
// ─────────────────────────────────────────────────
const getContacts = asyncHandler(async (req, res) => {
    const rawContacts = await ContactModel.find({ owner: req.user._id })
        .populate("contact", "username email avatar bio")
        .sort({ createdAt: -1 });

    // Attach online status from Redis
    const contacts = await Promise.all(
        rawContacts.map(async (c) => {
            const contactObj = c.toObject();
            if (contactObj.contact) {
                contactObj.contact.isOnline = await isUserOnline(contactObj.contact._id.toString());
            }
            return contactObj;
        })
    );

    return res.status(200).json(
        new ApiResponce(200, contacts, "Contacts fetched successfully")
    );
})

// ─────────────────────────────────────────────────
// DELETE /contacts/:id
// Deletes a single contact — only if owned by the logged-in user
// Does NOT delete conversation history
// ─────────────────────────────────────────────────
const deleteContact = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const contact = await ContactModel.findOne({
        _id: id,
        owner: req.user._id,
    });

    if (!contact) {
        throw new ApiError(404, "Contact not found");
    }

    await ContactModel.findByIdAndDelete(id);

    return res.status(200).json(
        new ApiResponce(200, {}, "Contact deleted successfully")
    );
})

export { addContact, getContacts, deleteContact }
