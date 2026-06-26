import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const DeleteContactDialog = ({ isOpen, onClose, onConfirm, contactName }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-sm bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            {/* Warning icon */}
                            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-400" />
                            </div>

                            <h3 className="text-white font-semibold text-lg mb-2">Delete Contact</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Are you sure you want to remove <span className="text-white font-medium">{contactName}</span> from your contacts? This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="flex-1 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DeleteContactDialog;
