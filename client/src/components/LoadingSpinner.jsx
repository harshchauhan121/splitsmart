const SIZES = { sm: 20, md: 28, lg: 40 };

export default function LoadingSpinner({ size = 'md' }) {
    const px = SIZES[size] || SIZES.md;
    return (
        <div className="flex items-center justify-center">
            <div
                className="rounded-full border-2 border-transparent border-t-[var(--accent-green)] animate-spin"
                style={{ width: px, height: px }}
            />
        </div>
    );
}
