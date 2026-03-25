const COLORS = ['#7c6af7', '#f76a6a', '#6af7c8', '#f7c86a', '#6aadf7', '#f76ac8'];

function hashName(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
    return h;
}

function getInitials(name = '') {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

const SIZES = { sm: 32, md: 40, lg: 48 };

export default function Avatar({ name = '', size = 'md', className = '' }) {
    const px = SIZES[size] || SIZES.md;
    const bg = COLORS[hashName(name) % COLORS.length];
    return (
        <div
            className={`inline-flex items-center justify-center rounded-full shrink-0 font-[Syne] font-bold text-white select-none ${className}`}
            style={{
                width: px,
                height: px,
                fontSize: px * 0.36,
                backgroundColor: bg,
                border: '2px solid var(--bg-card)',
            }}
            title={name}
        >
            {getInitials(name)}
        </div>
    );
}
