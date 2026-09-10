import { Rb_Button } from "@rentbook/rentbook-ui-lib";
import { FiX } from "react-icons/fi";

export interface DeleteConfirmationState {
    messageIds: string[];
    forEveryone: boolean;
}

interface DeleteConfirmationModalProps {
    confirmation: DeleteConfirmationState | null;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * The shared <Modal> from @rentbook/rentbook-ui-lib was rendering inline in
 * the document flow instead of as a centered overlay (it showed up as a
 * strip pinned to the bottom of the page). Rather than fight that component,
 * this is a plain fixed, full-viewport overlay - the same pattern already
 * used by the forward modal - so it's guaranteed to center correctly
 * regardless of where it's mounted in the tree.
 */
export default function DeleteConfirmationModal({
    confirmation,
    onClose,
    onConfirm,
}: DeleteConfirmationModalProps) {
    if (!confirmation) return null;

    const count = confirmation.messageIds.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">
                        Confirm delete
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                        <FiX />
                    </button>
                </div>

                <div className="py-2">
                    <p className="text-sm leading-6 text-slate-600">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-slate-800">
                            {count}
                        </span>{" "}
                        message
                        {count !== 1 ? "s" : ""}{" "}
                        {confirmation.forEveryone
                            ? "for everyone"
                            : "for you"}
                        ?
                    </p>

                    {confirmation.forEveryone && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-xs leading-5 text-red-600">
                                Deleting for everyone will remove these
                                messages from the conversation for all
                                participants.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-3 flex w-full justify-end gap-2 border-t border-slate-200 pt-3">
                    <Rb_Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Rb_Button>

                    <Rb_Button onClick={onConfirm}>
                        {confirmation.forEveryone
                            ? "Delete for everyone"
                            : "Delete for me"}
                    </Rb_Button>
                </div>
            </div>
        </div>
    );
}