import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { ApiError } from "../utils/ApiError.js"
import { ContactModel } from "../models/contact.model.js"
import { UserModel } from "../models/user.models.js"
import { isUserOnline, getOnlineStatusMap } from "../utils/redis.utils.js"

// Escape regex metacharacters so user input can't build an unbounded/invalid pattern
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─────────────────────────────────────────────────
// GET /contacts/search?q=...
// Search users by username or email (excluding logged-in user)
// ─────────────────────────────────────────────────
const searchUsers = asyncHandler(async (req, res) => {
    const { q = "" } = req.query;
    const queryStr = q.trim();

    if (!queryStr) {
        return res.status(200).json(
            new ApiResponce(200, [], "Empty search query")
        );
    }

    // Anchored prefix match so Mongo can use the username/email indexes
    // instead of a full collection scan (unanchored regex can't use an index).
    const regex = new RegExp("^" + escapeRegex(queryStr), "i");

    const [matchingUsers, userContacts] = await Promise.all([
        UserModel.find({
            _id: { $ne: req.user._id },
            $or: [{ username: regex }, { email: regex }]
        })
            .select("username email avatar bio")
            .limit(20)
            .lean(),
        ContactModel.find({ owner: req.user._id }).select("contact").lean(),
    ]);

    const contactUserIds = new Set(userContacts.map(c => c.contact.toString()));
    const onlineStatusMap = await getOnlineStatusMap(matchingUsers.map(u => u._id.toString()));

    const results = matchingUsers.map((u) => ({
        ...u,
        isAlreadyContact: contactUserIds.has(u._id.toString()),
        isOnline: onlineStatusMap.get(u._id.toString()) || false,
    }));

    return res.status(200).json(
        new ApiResponce(200, results, "Users searched successfully")
    );
})

// ─────────────────────────────────────────────────
// POST /contacts/add
// Adds a contact by contactUserId, username, or email
// ─────────────────────────────────────────────────
const addContact = asyncHandler(async (req, res) => {
    const { username, email, contactUserId } = req.body;

    let targetUser = null;

    if (contactUserId) {
        targetUser = await UserModel.findById(contactUserId);
    } else if (username && email) {
        targetUser = await UserModel.findOne({
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
        });
    } else if (username || email) {
        const queryVal = (username || email).toLowerCase().trim();
        targetUser = await UserModel.findOne({
            $or: [{ username: queryVal }, { email: queryVal }]
        });
    }

    if (!targetUser) {
        throw new ApiError(404, "User not found");
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
        const populatedContact = await ContactModel.findById(existingContact._id)
            .populate("contact", "username email avatar bio");

        const contactObj = populatedContact.toObject();
        contactObj.contact.isOnline = await isUserOnline(targetUser._id.toString());

        return res.status(200).json(
            new ApiResponce(200, contactObj, "User is already in your contacts")
        );
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

export { searchUsers, addContact, getContacts, deleteContact }
