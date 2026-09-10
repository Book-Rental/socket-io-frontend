import { FiCornerUpRight, FiTrash2 } from "react-icons/fi";

interface BulkActionToolbarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onForward: () => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
}

export default function BulkActionToolbar({
    selectedCount,
    totalCount,
    onSelectAll,
    onForward,
    onDeleteForMe,
    onDeleteForEveryone,
}: BulkActionToolbarProps) {
    const allSelected = selectedCount === totalCount && totalCount > 0;

    return (
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-6">
            <span className="mr-auto text-sm font-medium text-slate-700">
                {selectedCount} selected
            </span>

            <button
                type="button"
                onClick={onSelectAll}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
                {allSelected ? "Unselect all" : "Select all"}
            </button>

            <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onForward}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <FiCornerUpRight />
                Forward
            </button>

            <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onDeleteForMe}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <FiTrash2 />
                Delete
            </button>

            <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onDeleteForEveryone}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <FiTrash2 />
                Everyone
            </button>
        </div>
    );
}