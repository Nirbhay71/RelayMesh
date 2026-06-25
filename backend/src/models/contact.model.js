import mongoose from "mongoose"

/**
 * Contacts Collection
 * 
 * Each user maintains their own contact list independently.
 * Adding a contact is a one-way operation — if Rahul adds Amit,
 * only Rahul's list changes. Amit must explicitly add Rahul.
 * 
 * Compound unique index on (owner, contact) prevents duplicates.
 * Deleting a contact removes only this document, NOT conversation history.
 */
const ContactSchema = new mongoose.Schema({
    // The logged-in user who owns this contact entry
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    // The user being added as a contact
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true })

// Prevent duplicate contacts — a user cannot add the same person twice
ContactSchema.index({ owner: 1, contact: 1 }, { unique: true })

export const ContactModel = mongoose.model("Contact", ContactSchema)
