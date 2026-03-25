export default function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md relative"
                style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    padding: 32,
                    animation: 'modalSlideUp 250ms ease',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2
                        className="font-[Syne] font-bold text-white"
                        style={{ fontSize: 20 }}
                    >
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-muted)] hover:text-white text-xl leading-none cursor-pointer transition-colors"
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
