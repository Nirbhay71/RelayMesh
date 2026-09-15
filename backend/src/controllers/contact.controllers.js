import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { ApiError } from "../utils/ApiError.js"
import { ContactModel } from "../models/contact.model.js"
import { UserModel } from "../models/user.models.js"
import { ConversationModel } from "../models/conversation.model.js"
import { MessageModel } from "../models/message.model.js"
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
// GET /contacts/sidebar
// Unified sidebar feed: saved contacts + anyone who has messaged the user
// but isn't saved yet (contacts are one-way — see Contact model), each
// annotated with starred status, unread count, and last message preview.
// ─────────────────────────────────────────────────
const getSidebar = asyncHandler(async (req, res) => {
    const myId = req.user._id;

    const [rawContacts, conversations] = await Promise.all([
        ContactModel.find({ owner: myId }).populate("contact", "username email avatar bio").lean(),
        ConversationModel.find({ type: "private", participants: myId, lastMessage: { $ne: null } })
            .populate("participants", "username email avatar bio")
            .populate("lastMessage")
            .lean(),
    ]);

    const contactByUserId = new Map();
    rawContacts.forEach((c) => {
        if (c.contact?._id) contactByUserId.set(c.contact._id.toString(), c);
    });

    const convByUserId = new Map();
    const conversationIds = [];
    conversations.forEach((conv) => {
        const other = conv.participants.find((p) => p._id.toString() !== myId.toString());
        if (!other) return;
        conversationIds.push(conv._id);
        convByUserId.set(other._id.toString(), {
            conversationId: conv._id,
            lastMessage: conv.lastMessage,
            updatedAt: conv.updatedAt,
            otherUser: other,
        });
    });

    // Unread counts for every relevant conversation in a single aggregate query
    let unreadMap = new Map();
    if (conversationIds.length) {
        const unreadAgg = await MessageModel.aggregate([
            { $match: { conversationId: { $in: conversationIds }, sender: { $ne: myId }, readBy: { $ne: myId } } },
            { $group: { _id: "$conversationId", count: { $sum: 1 } } },
        ]);
        unreadMap = new Map(unreadAgg.map((u) => [u._id.toString(), u.count]));
    }

    const allUserIds = new Set([...contactByUserId.keys(), ...convByUserId.keys()]);
    const onlineStatusMap = await getOnlineStatusMap([...allUserIds]);

    const items = [...allUserIds].map((userId) => {
        const contactDoc = contactByUserId.get(userId);
        const convInfo = convByUserId.get(userId);
        const userInfo = contactDoc?.contact || convInfo?.otherUser;
        if (!userInfo) return null;

        return {
            _id: contactDoc ? contactDoc._id : `conv-${convInfo.conversationId}`,
            contact: { ...userInfo, isOnline: onlineStatusMap.get(userId) || false },
            isFromConversation: !contactDoc,
            starred: contactDoc?.starred || false,
            conversationId: convInfo?.conversationId || null,
            lastMessage: convInfo?.lastMessage || null,
            unreadCount: convInfo ? (unreadMap.get(convInfo.conversationId.toString()) || 0) : 0,
            updatedAt: convInfo?.updatedAt || contactDoc?.createdAt || null,
        };
    }).filter(Boolean);

    // Conversations sort by recency; contacts with no conversation yet sort by name after them
    items.sort((a, b) => {
        if (a.updatedAt && b.updatedAt) return new Date(b.updatedAt) - new Date(a.updatedAt);
        if (a.updatedAt) return -1;
        if (b.updatedAt) return 1;
        return (a.contact?.username || "").localeCompare(b.contact?.username || "");
    });

    return res.status(200).json(
        new ApiResponce(200, items, "Sidebar fetched successfully")
    );
})

// ─────────────────────────────────────────────────
// PATCH /contacts/:id/star
// Toggles the starred flag on a saved contact (quick-access row + Starred section)
// ─────────────────────────────────────────────────
const toggleStarContact = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const contact = await ContactModel.findOne({ _id: id, owner: req.user._id });
    if (!contact) {
        throw new ApiError(404, "Contact not found");
    }

    contact.starred = !contact.starred;
    await contact.save();

    return res.status(200).json(
        new ApiResponce(200, { _id: contact._id, starred: contact.starred }, "Contact star toggled")
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

export { searchUsers, addContact, getContacts, getSidebar, toggleStarContact, deleteContact }
