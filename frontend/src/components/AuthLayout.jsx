function AuthLayout({ children }) {
    return (
        <div className="auth-layout">

            {/* ── Left decorative panel ── */}
            <div className="auth-panel">

                {/* Big lock SVG */}
                <div className="auth-panel-lock">
                    <svg
                        width="160" height="160"
                        viewBox="0 0 100 120"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* shackle */}
                        <path
                            d="M25 48V34C25 19.1 36.2 8 51 8C65.8 8 77 19.1 77 34V48"
                            stroke="#a3e635"
                            strokeWidth="7"
                            strokeLinecap="round"
                            fill="none"
                        />
                        {/* body */}
                        <rect
                            x="12" y="46"
                            width="76" height="62"
                            rx="10"
                            fill="#a3e635"
                        />
                        {/* inner body shade */}
                        <rect
                            x="12" y="46"
                            width="76" height="62"
                            rx="10"
                            fill="url(#lockGrad)"
                        />
                        {/* keyhole circle */}
                        <circle cx="50" cy="74" r="10" fill="#fff" opacity="0.9"/>
                        {/* keyhole slot */}
                        <rect x="46" y="74" width="8" height="14" rx="4" fill="#fff" opacity="0.9"/>
                        <defs>
                            <linearGradient id="lockGrad" x1="12" y1="46" x2="88" y2="108" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15"/>
                                <stop offset="100%" stopColor="#000000" stopOpacity="0.06"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Headline */}
                <div className="auth-panel-text">
                    <h1>Secure <span>Cloud Vault</span></h1>
                    <p>
                        Store, manage and share your files with enterprise-grade
                        security. Your data stays yours — always encrypted, always safe.
                    </p>
                </div>

                {/* Feature pills */}
                <div className="auth-panel-features">
                    <div className="auth-feature-item">
                        <span className="icon">🔐</span>
                        Google Authenticator 2FA
                    </div>
                    <div className="auth-feature-item">
                        <span className="icon">☁️</span>
                        AWS S3 encrypted storage
                    </div>
                    <div className="auth-feature-item">
                        <span className="icon">📋</span>
                        Immutable activity logs
                    </div>
                    <div className="auth-feature-item">
                        <span className="icon">🛡️</span>
                        Per-user file isolation
                    </div>
                </div>

            </div>

            {/* ── Right: the actual form card ── */}
            <div className="auth-card-side">
                {children}
            </div>

        </div>
    );
}

export default AuthLayout;
