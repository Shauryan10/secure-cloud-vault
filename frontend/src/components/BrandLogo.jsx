function BrandLogo() {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{
                width: "40px",
                height: "40px",
                background: "#a3e635",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                     xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="11" width="14" height="10" rx="2" fill="#1a1a1a"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4"
                          stroke="#1a1a1a" strokeWidth="2"
                          strokeLinecap="round" fill="none"/>
                    <circle cx="12" cy="16" r="1.5" fill="#a3e635"/>
                </svg>
            </div>
            <span style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#1a1a1a",
                letterSpacing: "0.5px",
            }}>
                Secure <span style={{ color: "#65a30d" }}>Vault</span>
            </span>
        </div>
    );
}

export default BrandLogo;
